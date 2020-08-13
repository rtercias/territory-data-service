import orderBy from 'lodash/orderBy';
import { conn } from '../server';
import axios from 'axios';

class GroupAsync {
  async getGroups (congId) {
    if (!congId) throw new Error('congregation id required');
    return await conn.query(`SELECT code FROM groups WHERE congregation_id=${congId}`);
  }
}

export default new GroupAsync();
