import { toArray } from 'lodash';
import { conn } from './../../index';

class TerritoryAsync {
  async getTerritory (id) {
    return toArray(await conn.query(`SELECT * FROM territories WHERE id=${id}`))[0];
  }

  async getTerritories (congId) {
    return toArray(await conn.query(`SELECT * FROM territories WHERE congregationid=${congId}`));
  }

  async searchTerritories (congId, keyword) {
    return toArray(await conn.query(`SELECT * FROM territories WHERE congregationid=${congId} name LIKE '%${keyword}%' OR description LIKE '%${keyword}%'`));
  }

  async getTerritoryStatus (congId, territoryId, username) {
    return toArray(await conn.query(
      `
        SELECT ck.*, t.*, p.username, p.firstname, p.lastname, p.status AS publisher_status
        FROM territorycheckouts ck
        JOIN territories t ON ck.territoryid = t.id
        JOIN publishers p ON ck.publisherid = p.id
        WHERE t.congregationid=${congId}
        ${!!territoryId ? ` AND ck.territoryid=${territoryId}` : ''}
        ${!!username ? ` AND p.username='${username}'` : ''}
      `
    ));
  }

  async getTerritoriesByUser (congId, username) {
    return toArray(await conn.query(
      `
        SELECT ck.*, t.*
        FROM territorycheckouts_pivot ck
        JOIN territories t ON ck.territory_id = t.id
        WHERE ck.congregationid=${congId}
        AND ck.username='${username}'
        AND ck.in IS NULL
      `
    ));
  }

  async getMostRecentCheckin(territoryId, username) {
    return await conn.query(
      `
        SELECT ck.* FROM territorycheckouts ck
        JOIN publishers p ON ck.publisherid = p.id
        WHERE ck.territoryid=${territoryId} AND p.username='${username}'
        AND ck.status = 'IN'
        ORDER BY ck.timestamp DESC
        LIMIT 1
      `
    );
  }

  async getTerritoriesByCity (congId, city, territoryId) {
    const andCity = city ? ` city LIKE '%${city}%'` : '';
    const andTerritoryId = territoryId ? ` AND id=${territoryId}` : '';
    return toArray(await conn.query(`SELECT * FROM territories_by_city WHERE congregationid=${congId}${andCity}${andTerritoryId}`));
  }

  async getTerritoriesByGroupCode (congId, groupCode) {
    return toArray(await conn.query(`SELECT * FROM territories_by_city WHERE congregationid=${congId} AND group_code='${groupCode}' ORDER BY city, name`));
  }

  async saveTerritoryActivity(status, territoryId, publisherId, user) {
    if (user) {
      await conn.query(`INSERT INTO territorycheckouts (territoryid, publisherid, status, create_user) VALUES (${territoryId}, ${publisherId}, '${status}', '${user}')`);    
    } else {
      await conn.query(`INSERT INTO territorycheckouts (territoryid, publisherid, status) VALUES (${territoryId}, ${publisherId}, '${status}')`);    
    }
  }
}

export default new TerritoryAsync();
