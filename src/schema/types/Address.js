import addressAsync from './../../async/addresses';
import { Notes } from './../../utils/Notes';

export const Address = `
  type Address {
    id: Int!
    congregationId: Int!
    congregation: Congregation
    territory_id: Int!
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

export const queries = `
  address(id: Int, status: String): Address
  addresses(congId: Int, terrId: Int, keyword: String): [Address]
  inactiveAddresses(congId: Int, terrId: Int, keyword: String): [Address]
  dnc(congId: Int, keyword: String): [Address]
`;

export const mutations = `
  addAddress(address: AddressInput!): Address
  updateAddress(address: AddressInput!): Address
  changeAddressStatus(addressId: Int!, status: String!, userid: Int!, note: String): Boolean
  addNote(addressId: Int!, userid: Int!, note: String!): Boolean
  removeNote(addressId: Int!, userid: Int!, note: String!): Boolean
`;

export const queryResolvers = {
  address: async (root, args) => {
    try {
      if (args.id) {
        return await addressAsync.getAddress(args.id, args.status);

      } else if (root.address_id) {
        return await addressAsync.getAddress(root.address_id, root.status);
      }

    } catch (err) {
      console.error(err);
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
        result = await addressAsync.searchAddresses(congId, args.keyword, 'Active');
      }

      return result;

    } catch (err) {
      console.error(err);
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
    return await addressAsync.getAddress(id);
  },
  updateAddress: async (root, { address }) => {
    await addressAsync.update(address);
    return await addressAsync.getAddress(address.id);
  },
  changeAddressStatus: async (root, args) => {
    try {
      const notes = args.note && await Notes.add(args.addressId, args.note);
      await addressAsync.changeStatus(args.addressId, args.status, args.userid, notes);
      return true;

    } catch (err) {
      throw new Error(err);
    }
  },
  addNote: async (root, args) => {
    try {
      const address = await addressAsync.getAddress(args.addressId);
      const notes = await Notes.add(args.addressId, args.note, address);
      await addressAsync.update({ ...address, notes });
      return true;
    } catch (err) {
      throw new Error(err);
    }
  },
  removeNote: async (root, args) => {
    try {
      const address = await addressAsync.getAddress(args.addressId);
      const notes = await Notes.remove(args.addressId, args.note, address);
      await addressAsync.update({ ...address, notes });
      return true;
    } catch (err) {
      throw new Error(err);
    }

  },
};
