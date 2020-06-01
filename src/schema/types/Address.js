import addressAsync from './../../async/addresses';
import activityLogAsync from '../../async/activityLog';
import { query } from 'express';
import { capitalize } from 'lodash';

export const Address = `
  type Address {
    id: Int!
    congregationId: Int!
    congregation: Congregation
    territory_id: Int!
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
    activityLogs: [ActivityLog]
    sort: Int
    create_user: Int
    creator: Publisher
    create_date: String
    update_user: Int
    updater: Publisher
    update_date: String
  }
`;

export const AddressInput = `
  input AddressInput {
    id: Int
    congregationId: Int
    territory_id: Int
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

export const queries = `
  address(id: Int): Address
  addresses(congId: Int, terrId: Int, keyword: String): [Address]
  dnc(congId: Int, keyword: String): [Address]
`;

export const mutations = `
  addAddress(address: AddressInput!): Address
  updateAddress(address: AddressInput!): Address
  removeAddress(addressId: Int!, userid: Int!, notes: String!): Boolean
`;

export const queryResolvers = {
  address: async (root, args) => {
    try {
      if (args.id) {
        return await addressAsync.getAddress(args.id);

      } else if (root.address_id) {
        return await addressAsync.getAddress(root.address_id);
      }

    } catch (err) {
      console.error(err);
    }
  },

  addresses: async (root, args) => {
    try {
      let result;
      if ((args && args.terrId) || (root && root.id)) {
        result = await addressAsync.getAddressesByTerritory(args.terrId || root.id);
      }

      if (((root && root.congregationid) || args.congId) && args.keyword) {
        const congId = (root ? root.congregationid : null) || args.congId;
        result = await addressAsync.searchAddresses(congId);
      }

      return result;

    } catch (err) {
      console.error(err);
    }
  },

  dnc: async (root, args) => {
    try {
      let result;
      const congId = (root ? root.congregationid : null) || args.congId;
      result = await addressAsync.getDNC(congId, args.keyword);
      return result;
    } catch (err) {
      console.error(err);
    }
  },
};

export const mutationResolvers = {
  addAddress: async (root, { address }) => {
    const id = await addressAsync.create(address);
    const createdAddress = await addressAsync.getAddress(id);
    return createdAddress;
  },
  updateAddress: async (root, { address }) => {
    await addressAsync.update(address);
    const updatedAddress = await addressAsync.getAddress(address.id);
    return updatedAddress;
  },
  removeAddress: async (root, args) => {
    try {
      await addressAsync.softDelete(args.addressId, args.userid, args.notes);
      return true;

    } catch (e) {
      throw new Error(e);
      return false;
    }
  },
};
