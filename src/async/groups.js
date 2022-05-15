import get from 'lodash/get';
import { escape } from 'mysql';
import { pool } from '../server';
import terrAsync from './territories';

class GroupAsync {
  async get (id) {
    if (!id) throw new Error('group id required');
    const sql = `SELECT * FROM groups WHERE id=${id}`;
    const result = await pool.query(sql);
    return result && result.length && result[0];
  }
  async getAll (congId) {
    if (!congId) throw new Error('cong id is required');

    const sql = `SELECT * FROM groups WHERE congregation_id=${congId}`;
    return await pool.query(sql);
  }
  async getGroups (congId) {
    if (!congId) throw new Error('congregation id required');
    return await pool.query(`SELECT code FROM groups WHERE congregation_id=${congId}`);
  }

  async create (group) {
    if (!group.code) {
      throw new Error('group code is required');
    }
    if (!group.congregation_id) {
      throw new Error('cong id is required');
    }

    const results = await pool.query(`INSERT INTO groups (
      congregation_id,
      code,
      description,
      overseer
    ) VALUES (
      ${ group.congregation_id },
      ${ escape(group.code) },
      ${ escape(get(group, 'description')) || '' },
      ${ escape(get(group, 'overseer')) || '' }
    )`);

    return results.insertId;
  }

  async update (group) {
    if (!group.id) {
      throw new Error('group id is required');
    }
    if (!group.code) {
      throw new Error('group code is required');
    }
    if (!group.congregation_id) {
      throw new Error('cong id is required');
    }

    const sql = `UPDATE groups SET
      congregation_id = ${group.congregation_id},
      code = '${group.code}',
      description = ${escape(get(group, 'description')) || ''},
      overseer = ${escape(get(group, 'overseer')) || ''}
    WHERE id = ${group.id}`;

    await pool.query(sql);
  }

  async delete (id) {
    if (!id) throw new Error('id is required');

    const territories = await terrAsync.getTerritoriesByGroup(id);
    if (territories.length) {
      throw new Error('Cannot delete a group containing territories');
    }

    const sql = `DELETE FROM groups WHERE id = ${id}`;
    return await pool.query(sql);
  }
}

export default new GroupAsync();
