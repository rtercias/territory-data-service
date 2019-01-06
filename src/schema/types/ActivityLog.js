import activityLogAsync from '../../async/activityLog';

export const ActivityLog = `
  type ActivityLog {
    id: Int!
    checkout_id: Int!
    address_id: Int!
    address: Address
    value: String
    timestamp: String
    tz_offset: Int
    timezone: String
    publisher_id: Int!
    publisher: Publisher
    notes: String
  }
`;

export const ActivityLogInput = `
  input ActivityLogInput {
    id: Int!
    checkout_id: Int!
    address_id: Int!
    value: String
    tz_offset: Int
    timezone: String
    publisher_id: Int!
    notes: String
  }
`;

export const queries = `
  activityLog(id: Int): ActivityLog
  activityLogs(checkout_id: Int!, address_id: Int): [ActivityLog]
`;

export const mutations = `
  addLog(activityLog: ActivityLogInput): ActivityLog
  updateLog(activityLog: ActivityLogInput): ActivityLog
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
  addLog: async (root, { activityLog }) => {
    await activityLogAsync.create(activityLog);
  },
  updateLog: async (root, { activityLog }) => {
    await activityLogAsync.update(activityLog);
  },
  removeLog: async (root, { id }) => {
    await activityLogAsync.delete(id);
  },
};
