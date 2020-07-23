import { toArray } from 'lodash';
import { conn } from '../server';

class PublisherAsync {
  async getUser (username) {
    return (await conn.query(`SELECT * FROM users WHERE username='${username}'`))[0];
  }

  async getPublisherByName (firstName, lastName, congId) {
    return (await conn.query(`SELECT id, firstname, lastname, congregationid, username, status FROM publishers
      WHERE firstname='${firstName}' AND lastname='${lastName}' AND congregationid=${congId}`))[0];
  }

  async getPublisherById (publisherId, congId) {
    if (!publisherId) {
      return null;
    }

    const congIdFilter = congId ? ` AND congregationid=${congId}` : '';
    return (await conn.query(`SELECT id, firstname, lastname, congregationid, username, status FROM publishers
      WHERE id=${publisherId}${congIdFilter}`))[0];
  }

  async searchPublishers (congId, keyword) {
    const kw = keyword || '';
    const sql = `SELECT id, firstname, lastname, congregationid, username, status FROM publishers
      WHERE congregationid = ${congId} AND (firstname LIKE '%${kw}%' OR lastname LIKE '%${kw}%')`;
    return toArray(await conn.query(sql));
  }
}

export default new PublisherAsync();
