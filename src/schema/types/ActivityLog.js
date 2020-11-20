import { gql } from 'apollo-server-express';
import { pusher } from '../../server';
const { config } = require('firebase-functions');
import activityLogAsync from '../../async/activityLog';
import territoriesAsync from '../../async/territories';

export const ActivityLog = gql`
  type ActivityLog {
    id: Int
    checkout_id: Int
    address_id: Int
    value: String
    timestamp: String
    tz_offset: Int
    timezone: String
    publisher_id: Int
    notes: String
  }
`;

export const ActivityLogInput = gql`
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
      const checkout_id = args.checkout_id;
      const address_id = root.id;
      return await activityLogAsync.read(checkout_id, address_id);
    } catch (err) {
      console.error(err);
    }
  },
};

export const mutationResolvers = {
  addLog: async (root, { activityLog }) => {
    // check if territory is still checked out
    const status = await territoriesAsync.territoryCheckoutStatus(activityLog.checkout_id);
    if (status.in) throw new Error('Territory is no longer checked out.');
    
    const id = await activityLogAsync.create(activityLog);
    const newLog = await activityLogAsync.readOne(id);
    pusher.trigger('foreign-field', 'add-log', newLog);
    return newLog;
  },
  updateLog: async (root, { activityLog }) => {
    await activityLogAsync.update(activityLog);
  },
  removeLog: async (root, { id }) => {
    await activityLogAsync.delete(id);
  },
  resetTerritoryActivity: async(root, { checkout_id, userid, tz_offset, timezone }) => {
    const result = await activityLogAsync.resetTerritoryActivity(checkout_id, userid, tz_offset, timezone);
    pusher.trigger('foreign-field', 'territory-checkin', { checkout_id, userid, tz_offset, timezone });
    return result;
  },
};
