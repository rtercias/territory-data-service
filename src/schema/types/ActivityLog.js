import { ApolloError, gql } from 'apollo-server-express';
import { pusher } from '../../server';
const { config } = require('firebase-functions');
import activityLogAsync from '../../async/activityLog';
import territoriesAsync from '../../async/territories';

export const ActivityLog = gql`
  type ActivityLog {
    id: Int
    checkout_id: Int
    address_id: Int
    territory_id: Int
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
    } catch (error) {
      throw new ApolloError(
        'Unable to get activity log',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'ActivityLog/activityLog', arguments: { root, args }},
      );
    }
  },

  activityLogs: async (root, args) => {
    try {
      const territory_id = args.territory_id;
      const checkout_id = args.checkout_id || root.checkout_id;
      const address_id = territory_id ? null : root.id;
      return await activityLogAsync.read(checkout_id, address_id);
    } catch (error) {
      throw new ApolloError(
        'Unable to get activity logs',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'ActivityLog/activityLogs', arguments: { root, args }},
      );
    }
  },
  lastActivity: async (root, args) => {
    try {
      const { checkout_id } = args;
      const { id } = root;
      return await activityLogAsync.lastActivity(id, checkout_id);
    } catch (error) {
      throw new ApolloError(
        'Unable to get last activity',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'ActivityLog/lastActivity', arguments: { root, args }},
      );
    }
  },
};

export const mutationResolvers = {
  addLog: async (root, { activityLog }) => {
    try {
      // check if territory is still checked out
      const status = await territoriesAsync.territoryCheckoutStatus(activityLog.checkout_id);
      if (status && status.in) throw new Error('Territory is no longer checked out.');
      
      const id = await activityLogAsync.create(activityLog);
      const newLog = await activityLogAsync.readOne(id);
      pusher.trigger('foreign-field', 'add-log', newLog);
      return newLog;
    } catch (error) {
      throw new ApolloError(
        'Unable to add activity log',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'ActivityLog/addLog', arguments: { root, activityLog }},
      );
    }
  },
  updateLog: async (root, { activityLog }) => {
    try {
      await activityLogAsync.update(activityLog);
    } catch (error) {
      throw new ApolloError(
        'Unable to update activity log',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'ActivityLog/updateLog', arguments: { root, activityLog }},
      );
    }
  },
  removeLog: async (root, { id }) => {
    try {
      await activityLogAsync.delete(id);
    } catch (error) {
      throw new ApolloError(
        'Unable to remove activity log',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'ActivityLog/removeLog', arguments: { root, id }},
      );
    }
  },
  resetTerritoryActivity: async(root, { checkout_id, userid, tz_offset, timezone }) => {
    try {
      const result = await activityLogAsync.resetTerritoryActivity(checkout_id, userid, tz_offset, timezone);
      pusher.trigger('foreign-field', 'territory-checkin', { checkout_id, userid, tz_offset, timezone });
      return result;
    } catch (error) {
      throw new ApolloError(
        'Unable to reset territory activity',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'ActivityLog/resetTerritoryActivity', arguments: {
          root,
          checkout_id,
          userid,
          tz_offset,
          timezone,
        }},
      );
    }
  },
};
