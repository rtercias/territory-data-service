import { ApolloError, gql } from 'apollo-server-express';
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
    lastActivity(checkout_id: Int): ActivityLog
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
    } catch (error) {
      throw new ApolloError(
        'Unable to get phone',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Phone/phone', arguments: { root, args }},
      );
    }
  },

  phones: async (root, args) => {
    try {
      let result, parentId, terrId;

      if (args.congId && args.keyword) {
        // phone search query
        const congId = (root ? root.congregationid : null) || args.congId;
        result = await phoneAsync.searchPhones(congId, args.keyword, 'Active');

      } else if (root.addr1) {
        // root is an address
        parentId = root.id;
        result = await phoneAsync.getPhones(parentId, terrId, 'Active');

      } else {
        // root is a territory
        terrId = root.id;
        result = await phoneAsync.getPhones(null, terrId, 'Active');
      }

      return result;
    } catch (error) {
      throw new ApolloError(
        'Unable to get phones',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Phone/phones', arguments: { root, args }},
      );
    }
  },
};


export const mutationResolvers = {
  addPhone: async (root, { phone }) => {
    try {
      const id = await phoneAsync.create(phone);
      pusher.trigger('foreign-field', 'add-phone', { ...phone, id });
      return await phoneAsync.getPhone(id);
    } catch (error) {
      throw new ApolloError(
        'Unable to add phone',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Phone/addPhone', arguments: { root, phone }},
      );
    }
  },
  updatePhone: async (root, { phone }) => {
    try {
      await phoneAsync.update(phone);
      pusher.trigger('foreign-field', 'update-phone', phone);
      return await phoneAsync.getPhone(phone.id, '*');
    } catch (error) {
      throw new ApolloError(
        'Unable to update phone',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Phone/updatePhone', arguments: { root, phone }},
      );
    }
  },
  changePhoneStatus: async (root, args) => {
    try {
      const notes = args.note && await Notes.add(args.phoneId, args.note);
      await phoneAsync.changeStatus(args.phoneId, args.status, args.userid, notes);
      pusher.trigger('foreign-field', 'change-phone-status', { ...args, notes });
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to change phone status',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Phone/changePhoneStatus', arguments: { root, args }},
      );
    }
  },
  addPhoneTag: async (root, args) => {
    try {
      const phone = await phoneAsync.getPhone(args.phoneId, '*');
      const update_user = args.userid;
      const notes = await Notes.add(args.phoneId, args.note, phone);
      await phoneAsync.update({ ...phone, notes, update_user });
      pusher.trigger('foreign-field', 'add-phone-tag', { ...args, notes });
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to add phone tag',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Phone/addPhoneTag', arguments: { root, args }},
      );
    }
  },
  removePhoneTag: async (root, args) => {
    try {
      const phone = await phoneAsync.getPhone(args.phoneId, '*');
      const update_user = args.userid;
      const notes = await Notes.remove(args.phoneId, args.note, phone);
      await phoneAsync.update({ ...phone, notes, update_user });
      pusher.trigger('foreign-field', 'remove-phone-tag', { ...args, notes });
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to remove phone tag',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Phone/removePhoneTag', arguments: { root, args }},
      );
    }
  },
  updatePhoneSort: async (root, args) => {
    try {
      const { phoneIds, userid } = args;
      for (const [index, value]  of phoneIds.entries()) {
        await phoneAsync.updateSort(value, index + 1, userid);
      }
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to update phone sort',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Phone/updatePhoneSort', arguments: { root, args }},
      );
    }
  }
};
