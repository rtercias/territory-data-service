import { ApolloError, gql } from 'apollo-server-express';
import addressAsync from './../../async/addresses';
import { Notes } from './../../utils/Notes';
import { ActivityLog } from './ActivityLog';
import { Phone } from './Phone';
import { pusher } from '../../server';

export const Address = gql`
  type Address {
    id: Int!
    congregationId: Int!
    congregation: Congregation
    territory_id: Int
    type: String
    status: String!
    addr1: String
    addr2: String
    city: String
    state_province: String
    postal_code: String
    phone: String
    longitude: Float
    latitude: Float
    territory: Territory
    notes: String
    activityLogs(checkout_id: Int): [ActivityLog]
    sort: Int
    create_user: Int
    creator: Publisher
    create_date: String
    update_user: Int
    updater: Publisher
    update_date: String
    lastActivity(checkout_id: Int): ActivityLog
    distance: Float
    phones: [Phone]
    parent_id: Int
  }
`;

export const AddressInput = gql`
  input AddressInput {
    id: Int
    congregationId: Int
    territory_id: Int
    status: String
    addr1: String
    addr2: String
    city: String
    state_province: String
    postal_code: String
    phone: String
    longitude: Float
    latitude: Float
    notes: String
    sort: Int
    create_user: Int
    update_user: Int
  }
`;

export const queryResolvers = {
  address: async (root, args) => {
    try {
      if (args.id) {
        return await addressAsync.getAddress(args.id, args.status);

      } else if (root.address_id) {
        return await addressAsync.getAddress(root.address_id, args.status);
      } else if (root.record_id && root.table_name === 'addresses') {
        return await addressAsync.getAddress(root.record_id, '*');
      } else if (root.parent_id) {
        return await addressAsync.getAddress(root.parent_id, '*');
      }

    } catch (error) {
      throw new ApolloError(
        'Unable to get address',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Address/address', arguments: { root, args }},
      );
    }
  },

  addresses: async (root, args) => {
    try {
      let result;
      if ((args && args.terrId) || (root && root.id)) {
        const terrId = args.terrId || root.id;
        result = await addressAsync.getAddressesByTerritory(terrId, 'Active');
      }

      if (((root && root.congregationid) || args.congId) && args.keyword) {
        const congId = (root ? root.congregationid : null) || args.congId;
        result = await addressAsync.searchAddresses(congId, args.keyword, args.status);
      }

      return result;
    } catch (error) {
      throw new ApolloError(
        'Unable to get addresses',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Address/addresses', arguments: { root, args }},
      );
    }
  },

  inactiveAddresses: async (root, args) => {
    try {
      let result;
      if ((args && args.terrId) || (root && root.id)) {
        const terrId = args.terrId || root.id;
        const status = args.status || root.status;
        result = await addressAsync.getAddressesByTerritory(terrId, '!Active');
      }

      if (((root && root.congregationid) || args.congId) && args.keyword) {
        const congId = (root ? root.congregationid : null) || args.congId;
        result = await addressAsync.searchAddresses(congId, args.keyword, '!isActive');
      }

      return result;
    } catch (error) {
      throw new ApolloError(
        'Unable to get inactive addresses',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Address/inactiveAddresses', arguments: { root, args }},
      );
    }
  },

  dnc: async (root, args) => {
    try {
      let result;
      const congId = (root ? root.congregationid : null) || args.congId;
      result = await addressAsync.getDNC(congId, args.keyword);
      return result;
    } catch (error) {
      throw new ApolloError(
        'Unable to get dnc',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Address/dnc', arguments: { root, args }},
      );
    }
  },

  nearestAddresses: async (root, args) => {
    try {
      const { congId, coordinates, radius, unit, skip, take } = args;
      return await addressAsync.getNearestAddresses(congId, coordinates, radius, unit, skip, take);
    } catch (error) {
      throw new ApolloError(
        'Unable to get neared addresses',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Address/nearestAddresses', arguments: { root, args }},
      );
    }
  },
};


export const mutationResolvers = {
  addAddress: async (root, { address }) => {
    try {
      const id = await addressAsync.create(address);
      pusher.trigger('foreign-field', 'add-address', { ...address, id });
      return await addressAsync.getAddress(id);
    } catch (error) {
      throw new ApolloError(
        'Unable to add address',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Address/addAddress', arguments: { root, address }},
      );
    }
  },
  updateAddress: async (root, { address }) => {
    try {
      await addressAsync.update(address);
      pusher.trigger('foreign-field', 'update-address', address);
      return await addressAsync.getAddress(address.id, '*');
    } catch (error) {
      throw new ApolloError(
        'Unable to update address',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Address/updateAddress', arguments: { root, address }},
      );
    }
  },
  deleteAddress: async( root, { id }) => {
    try {
      await addressAsync.delete(id);
      pusher.trigger('foreign-field', 'delete-address', id);
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to delete address',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Address/deleteAddress', arguments: { root, id }},
      );
    }
  },
  changeAddressStatus: async (root, args) => {
    try {
      const notes = args.note && await Notes.add(args.addressId, args.note);
      await addressAsync.changeStatus(args.addressId, args.status, args.userid, notes);
      pusher.trigger('foreign-field', 'change-address-status', args);
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to change address status',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Address/changeAddressStatus', arguments: { root, args }},
      );
    }
  },
  addNote: async (root, args) => {
    try {
      const address = await addressAsync.getAddress(args.addressId, '*');
      const update_user = args.userid;
      const notes = await Notes.add(args.addressId, args.note, address);
      await addressAsync.update({ ...address, notes, update_user });
      pusher.trigger('foreign-field', 'add-note', { ...args, notes });
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to add note',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Address/addNote', arguments: { root, args }},
      );
    }
  },
  removeNote: async (root, args) => {
    try {
      const address = await addressAsync.getAddress(args.addressId, '*');
      const update_user = args.userid;
      const notes = await Notes.remove(args.addressId, args.note, address);
      await addressAsync.update({ ...address, notes, update_user });
      pusher.trigger('foreign-field', 'remove-note', { ...args, notes });
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to remove note',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Address/removeNote', arguments: { root, args }},
      );
    }
  },
  updateSort: async (root, args) => {
    try {
      const { addressIds, userid } = args;
      for (const [index, value]  of addressIds.entries()) {
        await addressAsync.updateSort(value, index + 1, userid);
      }
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to update sort',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Address/updateSort', arguments: { root, args }},
      );
    }
  }
};
