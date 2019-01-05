import addressAsync from './../../async/addresses';

export const Address = `
  type Address {
    id: Int!
    congregationId: Int!
    territory_id: Int
    addr1: String
    addr2: String
    city(name: String): String
    state_province: String
    postal_code: String
    phone: String
    longitude: Float
    latitude: Float
    territory: Territory
    notes: String,
    activityLogs: [ActivityLog]
  }
`;

export const queries = `
  address(id: Int): Address
  addresses(congId: Int, terrId: Int, keyword: String): [Address]
  dnc(congId: Int, keyword: String): [Address]
`;

export const resolvers = {
  address: async (root, args) => {
    try {
      return await addressAsync.getAddress(args.id);
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

