'use strict';

/**
 * SmartGrant claim-risk triage engine.
 *
 * This is the prototype stand-in for the concept's "predictive models to flag
 * high-risk claims for review" and "computer vision on EODS/aerial imagery to
 * pre-validate land parcels". It is deliberately deterministic and rule-based
 * so its behaviour is explainable and auditable. It NEVER makes a decision:
 * every output is advisory, and a named case officer must sign off every
 * determination (mandatory human-in-the-loop, per the Stage 2 risk
 * mitigations).
 */

const db = require('./db');

const BANDS = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

/**
 * Validate the claimed parcel against the land-parcel register (prototype
 * proxy for LPIS + Earth-observation cross-checks).
 */
function validateMapping(parcelRef, claimedArea) {
  const parcel = db.get('SELECT * FROM parcels WHERE parcel_ref = ?', parcelRef);
  if (!parcel) {
    return {
      found: false,
      registeredArea: null,
      claimedArea,
      verdict: 'not_found',
      message: `Parcel ${parcelRef} is not in the land-parcel register. Manual mapping check required.`
    };
  }
  const over = claimedArea - parcel.area_ha;
  const overPct = parcel.area_ha > 0 ? (over / parcel.area_ha) * 100 : 0;
  let verdict = 'match';
  let message = `Claimed area ${claimedArea} ha is within the registered parcel area (${parcel.area_ha} ha).`;
  if (over > 0 && overPct <= 10) {
    verdict = 'minor_over';
    message = `Claimed area ${claimedArea} ha exceeds the registered area (${parcel.area_ha} ha) by ${overPct.toFixed(1)}%. Boundary review recommended.`;
  } else if (over > 0) {
    verdict = 'over';
    message = `Claimed area ${claimedArea} ha exceeds the registered area (${parcel.area_ha} ha) by ${overPct.toFixed(1)}%. Mapping validation failed — officer must resolve before approval.`;
  }
  return {
    found: true,
    registeredArea: parcel.area_ha,
    landCover: parcel.land_cover,
    county: parcel.county,
    claimedArea,
    verdict,
    message
  };
}

/**
 * Score a claim for review priority. Returns { score, band, flags, mapping }.
 * Flags are plain-English so officers (and applicants, on their own record)
 * can see exactly why a claim was prioritised — transparency by design.
 */
function triage({ userId, parcelRef, claimedArea, amount, excludeApplicationId = null }) {
  const flags = [];
  let score = 0;

  const mapping = validateMapping(parcelRef, claimedArea);
  if (mapping.verdict === 'not_found') {
    score += 35;
    flags.push({ points: 35, reason: 'Parcel reference not found in the land-parcel register.' });
  } else if (mapping.verdict === 'over') {
    score += 40;
    flags.push({ points: 40, reason: `Claimed area exceeds registered parcel area by more than 10% (${claimedArea} ha claimed vs ${mapping.registeredArea} ha registered).` });
  } else if (mapping.verdict === 'minor_over') {
    score += 20;
    flags.push({ points: 20, reason: `Claimed area slightly exceeds registered parcel area (${claimedArea} ha claimed vs ${mapping.registeredArea} ha registered).` });
  }

  const dupSql = excludeApplicationId
    ? "SELECT COUNT(*) AS n FROM applications WHERE parcel_ref = ? AND status NOT IN ('rejected') AND id != ?"
    : "SELECT COUNT(*) AS n FROM applications WHERE parcel_ref = ? AND status NOT IN ('rejected')";
  const dup = excludeApplicationId
    ? db.get(dupSql, parcelRef, excludeApplicationId)
    : db.get(dupSql, parcelRef);
  if (dup && dup.n > 0) {
    score += 30;
    flags.push({ points: 30, reason: `Parcel ${parcelRef} already appears on ${dup.n} other live application(s) — possible duplicate or overlapping claim.` });
  }

  if (amount > 100000) {
    score += 25;
    flags.push({ points: 25, reason: 'High-value claim (over £100,000) — enhanced checks apply.' });
  } else if (amount > 50000) {
    score += 15;
    flags.push({ points: 15, reason: 'Claim value over £50,000 — additional verification recommended.' });
  }

  const history = db.get(
    "SELECT COUNT(*) AS n FROM applications WHERE user_id = ? AND status IN ('approved','paid')",
    userId
  );
  if (!history || history.n === 0) {
    score += 10;
    flags.push({ points: 10, reason: 'First application from this business — no approved payment history.' });
  }

  const band = score >= 60 ? BANDS.HIGH : score >= 30 ? BANDS.MEDIUM : BANDS.LOW;
  return { score, band, flags, mapping };
}

module.exports = { triage, validateMapping, BANDS };
