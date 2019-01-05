import activityLogAsync from '../../async/activityLog';

export const ActivityLog = `\
  type ActivityLog {
    id: Int!
    checkout_id: Int!
    territory_id: Int!
    territory: Territory
    address_id: Int!
    address: Address
    value: String
    timestamp: String
    tz_offset: String
    timezone: String
    publisher_id: Int!
    publisher: Publisher
    notes: String
  }
`;

export const queries = `
  activityLog(id: Int): Address
  activityLogs(checkout_id: Int!, address_id: Int): [Address]
`;

export const mutations = `
  addLog(checkout_id: Int!, address_id: Int!, value: String!, publisher_id: Int!, notes: String): ActivityLog
  updateLog(id: Int!, value: String, notes: String): ActivityLog
  removeLog(id: Int!): Boolean
`;

export const resolvers = {
  activityLog: async (root, args) => {
    try {
      return await activityLogAsync.readOne(args.id);
    } catch (err) {
      console.error(err);
    }
  },

  activityLogs: async (root, args) => {
    try {
      return await activityLogAsync.read(args.checkout_id, args.address_id);
    } catch (err) {
      console.error(err);
    }
  },
};

export const mutationResolvers = {
  addLog: async (root, activityLog) => {
    await activityLogAsync.create(activityLog);
  },
  updateLog: async (root, activityLog) => {
    await activityLog.update(activityLog);
  },
  removeLog: async (root, id) => {
    await activityLogAsync.delete(id);
  },
};
