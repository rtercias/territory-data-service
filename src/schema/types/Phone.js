import { gql } from 'apollo-server-express';
import phoneAsync from '../../async/phones';
import { Notes } from '../../utils/Notes';
import { ActivityLog } from './ActivityLog';

export const Phone = gql`
  type Phone {
    id: Int!
    congregationId: Int!
    congregation: Congregation
    parent_id: Int
    parent: Address
    territory_id: Int
    territory: Territory
    type: String!
    status: String!
    phone: String
    notes: String
    activityLogs: [ActivityLog]
    sort: Int
    create_user: Int
    creator: Publisher
    create_date: String
    update_user: Int
    updater: Publisher
    update_date: String
    lastActivity: ActivityLog
  }
`;

export const PhoneInput = gql`
  input PhoneInput {
    id: Int
    congregationId: Int
    parent_id: Int
    territory_id: Int
    type: String!
    status: String!
    phone: String
    notes: String
    sort: Int
    create_user: Int
    update_user: Int
  }
`;

export const queryResolvers = {
  phone: async (root, args) => {
    try {
      if (args.id) {
        return await phoneAsync.getPhone(args.id, args.status);
      } else if (root.phone_id) {
        return await phoneAsync.getPhone(root.phone_id, args.status);
      } else if (root.record_id && root.table_name === 'addresses') {
        return await phoneAsync.getPhone(root.record_id, '*');
      }

    } catch (err) {
      console.error(err);
    }
  },

  phones: async (root, args) => {
    try {
      let result;
      if ((args && args.parentId) || (root && root.id)) {
        const parentId = args.parentId || root.id;
        const terrId = args.terrId;
        result = await phonesAsync.getPhones(parentId, terrId, 'Active');
      }

      if (((root && root.congregationid) || args.congId) && args.keyword) {
        const congId = (root ? root.congregationid : null) || args.congId;
        result = await phonesAsync.searchPhones(congId, args.keyword, 'Active');
      }

      return result;

    } catch (err) {
      console.error(err);
    }
  },

  lastActivity: async (root, args) => {
    try {
      const phoneId = (root && root.id) || (args && args.phoneId);
      return await phoneAsync.lastActivity(phoneId);
    } catch (err) {
      console.error(err);
    }
  },
};


export const mutationResolvers = {
  addPhone: async (root, { phone }) => {
    const id = await phoneAsync.create(phone);
    return await phoneAsync.getPhone(id);
  },
  updatePhone: async (root, { phone }) => {
    await phoneAsync.update(phone);
    return await phoneAsync.getPhone(phone.id, '*');
  },
  changePhoneStatus: async (root, args) => {
    try {
      const notes = args.note && await Notes.add(args.phoneId, args.note);
      await phoneAsync.changeStatus(args.phoneId, args.status, args.userid, notes);
      return true;

    } catch (err) {
      throw new Error(err);
    }
  },
  addPhoneTag: async (root, args) => {
    try {
      const phone = await phoneAsync.getPhone(args.phoneId, '*');
      const update_user = args.userid;
      const notes = await Notes.add(args.phoneId, args.note, phone);
      await phoneAsync.update({ ...phone, notes, update_user });
      return true;
    } catch (err) {
      throw new Error(err);
    }
  },
  removePhoneTag: async (root, args) => {
    try {
      const phone = await phoneAsync.getPhone(args.phoneId, '*');
      const update_user = args.userid;
      const notes = await Notes.remove(args.phoneId, args.note, phone);
      await phoneAsync.update({ ...phone, notes, update_user });
      return true;
    } catch (err) {
      throw new Error(err);
    }
  },
  updatePhoneSort: async (root, args) => {
    let success = false;
    try {
      const { phoneIds, userid } = args;
      for (const [index, value]  of phoneIds.entries()) {
        await phoneAsync.updateSort(value, index + 1, userid);
      }
      success = true;
    } catch (err) {
      throw new Error(err);
    }

    return success;
  }
};
