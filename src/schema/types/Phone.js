import { gql } from 'apollo-server-express';
import phoneAsync from '../../async/phones';
import { Notes } from '../../utils/Notes';
import { ActivityLog } from './ActivityLog';
import { pusher } from '../../server';

export const Phone = gql`
  type Phone {
    id: Int!
    congregationId: Int!
    congregation: Congregation
    parent_id: Int
    address: Address
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
    if (args.id) {
      return await phoneAsync.getPhone(args.id, args.status);
    } else if (root.phone_id) {
      return await phoneAsync.getPhone(root.phone_id, args.status);
    } else if (root.record_id && root.table_name === 'addresses') {
      return await phoneAsync.getPhone(root.record_id, '*');
    }
  },

  phones: async (root, args) => {
    let result;
    if ((args && args.parent_id) || (root && root.id)) {
      const parentId = args.parent_id || root.id;
      const terrId = args.terrId;
      result = await phoneAsync.getPhones(parentId, terrId, 'Active');
    }

    if (((root && root.congregationid) || args.congId) && args.keyword) {
      const congId = (root ? root.congregationid : null) || args.congId;
      result = await phoneAsync.searchPhones(congId, args.keyword, 'Active');
    }

    return result;
  },

  lastActivity: async (root, args) => {
    const phoneId = (root && root.id) || (args && args.phoneId);
    const checkoutId = (root && root.checkout_id) || (args && args.checkout_id);
    return await phoneAsync.lastActivity(phoneId, checkoutId);
  },
};


export const mutationResolvers = {
  addPhone: async (root, { phone }) => {
    const id = await phoneAsync.create(phone);
    pusher.trigger('foreign-field', 'add-phone', { ...phone, id });
    return await phoneAsync.getPhone(id);
  },
  updatePhone: async (root, { phone }) => {
    await phoneAsync.update(phone);
    pusher.trigger('foreign-field', 'update-phone', phone);
    return await phoneAsync.getPhone(phone.id, '*');
  },
  changePhoneStatus: async (root, args) => {
    const notes = args.note && await Notes.add(args.phoneId, args.note);
    await phoneAsync.changeStatus(args.phoneId, args.status, args.userid, notes);
    pusher.trigger('foreign-field', 'change-phone-status', { ...args, notes });
    return true;
  },
  addPhoneTag: async (root, args) => {
    const phone = await phoneAsync.getPhone(args.phoneId, '*');
    const update_user = args.userid;
    const notes = await Notes.add(args.phoneId, args.note, phone);
    await phoneAsync.update({ ...phone, notes, update_user });
    pusher.trigger('foreign-field', 'add-phone-tag', { ...args, notes });
    return true;
  },
  removePhoneTag: async (root, args) => {
    const phone = await phoneAsync.getPhone(args.phoneId, '*');
    const update_user = args.userid;
    const notes = await Notes.remove(args.phoneId, args.note, phone);
    await phoneAsync.update({ ...phone, notes, update_user });
    pusher.trigger('foreign-field', 'remove-phone-tag', { ...args, notes });
    return true;
  },
  updatePhoneSort: async (root, args) => {
    const { phoneIds, userid } = args;
    for (const [index, value]  of phoneIds.entries()) {
      await phoneAsync.updateSort(value, index + 1, userid);
    }
    return true;
  }
};
