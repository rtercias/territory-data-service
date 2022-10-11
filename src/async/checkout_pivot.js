import { pool } from '../server';

export const checkoutPivotFields = `
  ckout.id AS checkout_id, ckout.territoryid AS territory_id,
  DATE_FORMAT(ckout.timestamp, '%m/%d/%Y') AS 'out', ckout.publisherid AS publisher_id,
  ckout.timestamp, ckin.in, ckin.parent_checkout_id, ckin.parent_checkout_id,
  ckin.timestamp AS timestamp_in, ckin.publisherid AS publisher_id_in`;

export const checkoutPivotJoin = `
  LEFT JOIN (
    SELECT id, territoryid, publisherid, timestamp
      FROM territorycheckouts ckout2
      WHERE
        id = (
          SELECT cklast.id
          FROM territorycheckouts cklast
          WHERE cklast.territoryid = ckout2.territoryid AND cklast.status = 'OUT'
          ORDER BY cklast.id DESC
          LIMIT 1
        )
  ) ckout ON t.id = ckout.territoryid
  LEFT JOIN (
    SELECT territoryid, parent_checkout_id, timestamp, publisherid, 
      DATE_FORMAT(timestamp, '%m/%d/%Y') AS 'in'
    FROM territorycheckouts
    WHERE status = 'IN'
  ) AS ckin ON ckin.territoryid = ckout.territoryid AND ckin.parent_checkout_id = ckout.id`;

export const checkoutPivotWhere = `
  ckout.id = (SELECT cklast.id
    FROM territorycheckouts cklast
    WHERE cklast.territoryid = ckout.territoryid AND cklast.status = 'OUT'
    ORDER BY cklast.id DESC
    LIMIT 1)`;

export const campaignSubquery = `(
  SELECT c.id AS campaign_id
  FROM campaigns c
  WHERE c.congregation_id = t.congregationid
    AND ckout.timestamp >= c.start_date
    AND ckout.timestamp <= IFNULL(c.end_date, NOW())
  ORDER BY c.start_date DESC , c.end_date DESC
  LIMIT 1
)`;
