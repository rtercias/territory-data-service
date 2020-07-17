import { toArray } from 'lodash';
import { conn } from '../server';

class PublisherAsync {
  async getUser (username) {
    return (await conn.query(`SELECT * FROM users WHERE username='${username}'`))[0];
  }

  async getPublisherByName (firstName, lastName) {
    return (await conn.query(`SELECT id, firstname, lastname, congregationid, username, status FROM publishers
      WHERE firstname='${firstName}' AND lastname='${lastName}'`))[0];
  }

  async getPublisherById (publisherId, congId) {
    if (!publisherId || !congId) {
      return null;
    }
    return (await conn.query(`SELECT id, firstname, lastname, congregationid, username, status FROM publishers
      WHERE id=${publisherId} AND congregationid=${congId}`))[0];
  }

  async searchPublishers (congId, keyword) {
    const kw = keyword || '';
    const sql = `SELECT id, firstname, lastname, congregationid, username, status FROM publishers
      WHERE congregationid = ${congId} AND (firstname LIKE '%${kw}%' OR lastname LIKE '%${kw}%')`;
    return toArray(await conn.query(sql));
  }
}

export default new PublisherAsync();
