import toArray from 'lodash/toArray';
import get from 'lodash/get';
import { conn } from '../server';

class PublisherAsync {
  async getUser (username) {
    return (await conn.query(`SELECT * FROM users WHERE username='${username}'`))[0];
  }

  async getPublisherByName (firstName, lastName, congId) {
    return (await conn.query(`SELECT * FROM users
      WHERE firstname='${firstName}' AND lastname='${lastName}' AND congregationid=${congId}`))[0];
  }

  async getPublisherById (publisherId, congId) {
    if (!publisherId) {
      return null;
    }

    const congIdFilter = congId ? ` AND congregationid=${congId}` : '';
    return (await conn.query(`SELECT * FROM users
      WHERE id=${publisherId}${congIdFilter}`))[0];
  }

  async searchPublishers (congId, keyword) {
    const kw = keyword || '';
    const sql = `SELECT * FROM users
      WHERE congregationid = ${congId} AND (firstname LIKE '%${kw}%' OR lastname LIKE '%${kw}%')`;
    return toArray(await conn.query(sql));
  }

  async create (publisher) {
    if (!publisher.congregationid) {
      throw new Error('congregation id is required');
    }
    if (!publisher.username) {
      throw new Error('username is required');
    }
    if (!publisher.create_user) {
      throw new Error('create user is required');
    }
    if (!publisher.role) {
      throw new Error('role is required');
    }

    const sql = `INSERT INTO publishers (
      congregationid,
      username,
      firstname,
      lastname,
      create_user,
      status
    ) VALUES (
      ${ get(publisher, 'congregationid', '') },
      '${ get(publisher, 'username', '') }',
      '${ get(publisher, 'firstname', '') }',
      '${ get(publisher, 'lastname', '') }',
      '${ get(publisher, 'create_user', '') }',
      '${ get(publisher, 'status', 'active') }'
    )`;
    const result = await conn.query(sql);
    const role = await conn.query(`SELECT id FROM roles WHERE name = '${get(publisher, 'role')}'`);
    if (role && role.length) {
      const roleSql = `INSERT INTO publisherroles (publisher_id, role_id)
        VALUES (${ result.insertId }, '${role[0].id}')`;
      await conn.query(roleSql);
    }

    return result.insertId;
  }

  async update (publisher) {
    if (!(publisher && publisher.id)) {
      throw new Error('id is required');
    }
    if (!publisher.congregationid) {
      throw new Error('congregation id is required');
    }
    if (!publisher.username) {
      throw new Error('username is required');
    }
    if (!publisher.update_user) {
      throw new Error('update user is required');
    }

    const sql = `UPDATE publishers SET
      congregationid = ${get(publisher, 'congregationid', '')},
      username = '${get(publisher, 'username', '')}',
      firstname = '${get(publisher, 'firstname', '')}',
      lastname = '${get(publisher, 'lastname', '')}',
      update_user = ${get(publisher, 'update_user', '')},
      status = '${get(publisher, 'status', '')}'
    WHERE id = ${publisher.id}`;
    await conn.query(sql);

    if (publisher.role) {
      const role = await conn.query(`SELECT id FROM roles WHERE name = '${get(publisher, 'role')}'`);
      if (role && role.length) {
        const roleSql = `UPDATE publisherroles SET role_id = ${role[0].id}
          WHERE publisher_id = ${publisher.id}`;
        await conn.query(roleSql);
      }
    }
  }

  async delete (id) {
    if (!id) throw new Error('id is required');
    const sql = `DELETE FROM publishers WHERE id = ${id}`;
    return await conn.query(sql);
  }
}

export default new PublisherAsync();
