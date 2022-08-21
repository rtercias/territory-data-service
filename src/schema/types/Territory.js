import { ApolloError, gql } from 'apollo-server-express';
import terrAsync from './../../async/territories';
import congAsync from './../../async/congregations';
import publisherAsync from './../../async/publishers';
import { get } from 'lodash';
import { differenceInCalendarDays, isBefore, isAfter } from 'date-fns';
import { pusher } from '../../server';
import activityLog from '../../async/activityLog';
import { getCurrentCampaign } from '../../async/campaigns';

const DEFAULT_DAY_LIMIT = 30;
let cong, congOptions, dayLimit, currentCampaign;

export const Territory = gql`
  type Territory {
    id: Int!
    congregationid: Int!
    name: String
    description: String
    type: String
    group_id: Int!
    group: Group
    addresses: [Address]
    inactiveAddresses: [Address]
    city: String
    status: Status
    lastActivity: ActivityLog
    lastActivities(checkout_id: Int): [ActivityLog]
    phones: [Phone]
    tags: String
    addressCount: Int
    phoneCount: Int
  }
`;

export const TerritoryInput = gql`
  input TerritoryInput {
    id: Int
    congregationid: Int!
    name: String
    description: String
    type: String
    group_id: Int!
    create_user: Int
    update_user: Int
    tags: String
  }
`;

export const queryResolvers = {
  territory: async (root, args) => {
    try {
      let result;
      if (args.id) {
        result = await terrAsync.getTerritory(args.id);
      }

      if (root && (root.territory_id || root.territoryid)) {
        result = await terrAsync.getTerritory(root.territory_id || root.territoryid);
      }
      return result;
    } catch (error) {
      throw new ApolloError(
        'Unable to get territory',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Territory/territory', arguments: { root, args }},
      );
    }
  },

  territories: async (root, args) => {
    try {
      const { withStatus } = args;
      if (((root && root.congregationid) || args.congId) && args.keyword) {
        const congId = (root ? root.congregationid : null) || args.congId;
        return await terrAsync.searchTerritories(congId, args.keyword, withStatus);
      }

      if (args && args.group_id) {
        return await terrAsync.getTerritoriesByGroup(args.group_id, args.limit, args.offset, withStatus);
      }
      
      if (root && root.congregationid && root.username) {
        return await terrAsync.getTerritoriesByUser(
          root.congregationid,
          root.username,
          args.limit,
          args.offset,
        );
      }

      if ((args && args.congId) || (root && root.id)) {
        return await terrAsync.getTerritories(args.congId || root.id, args.limit, args.offset, withStatus);
      }
    } catch (error) {
      throw new ApolloError(
        'Unable to get territories',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Territory/territories', arguments: { root, args }},
      );
    }
  },

  status: async(root, args) => {
    try {
      if (!root.checkout_id) {
        return {
          status: 'Available',
        };
      }

      cong = cong || await congAsync.getCongregationById(root.congregationid);
      congOptions = congOptions || (cong && JSON.parse(cong.options));
      dayLimit = dayLimit || get(congOptions, 'territories.cycle') || DEFAULT_DAY_LIMIT;
      currentCampaign = currentCampaign || (cong && await getCurrentCampaign(cong.id));
      // for a user's territory, checkout status info is already in the root data.
      // No need to fetch territory status from db
      if (root && root.username) {
        // no check-in date... territory is Checked Out
        if (root.in === null) {
          return {
            status: 'Checked Out',
            checkout_id: root.checkout_id,
            date: root.out,
            publisherid: root.publisher_id,
            territoryid: root.territory_id,
            campaign: root.campaign,
            campaign_id: root.campaign_id,
          };
        
        // there's a check-in date... 
        // is there a campaign going on?
        } else if (currentCampaign) {
          const campaignStartDate = new Date(currentCampaign.start_date);
          const campaignEndDate = currentCampaign.end_date ?
            new Date(currentCampaign.end_date) :
            new Date();

          // does the checkout timestamp fall within the start and end date of the campaign?
          // if so, this is a Recently Worked (or Done) territory
          if (isAfter(root.timestamp, campaignStartDate)
          && isBefore(root.timestamp, campaignEndDate)) {
            return {
              date: root.in,
              status: 'Recently Worked', // this gets translated to 'Done' on the client
              checkout_id: root.checkout_id,
              publisherid: root.publisher_id,
              territoryid: root.territory_id,
              campaign: root.campaign,
              campaign_id: root.campaign_id,
            };
          } else {
            return {
              date: root.in,
              status: 'Available',
              checkout_id: root.checkout_id,
              publisherid: root.publisher_id,
              territoryid: root.territory_id,
              campaign: root.campaign,
              campaign_id: root.campaign_id,
            };
          }
        
        // there's no campaign
        } else {
          // has it been X number of days since the territory was checked in?
          // if it has been less than or equal to the limit, this is a Recently Worked territory
          if (differenceInCalendarDays(new Date(), root.in) <= dayLimit) {
            return {
              date: root.in,
              status: 'Recently Worked',
              checkout_id: root.checkout_id,
              publisherid: root.publisher_id,
              territoryid: root.territory_id,
              campaign: root.campaign,
              campaign_id: root.campaign_id,
            };
          // if it has been greater than the limit, the territory is Available for check out
          } else {
            return {
              date: root.in,
              status: 'Available',
              checkout_id: root.checkout_id,
              publisherid: root.publisher_id,
              territoryid: root.territory_id,
              campaign: root.campaign,
              campaign_id: root.campaign_id,
            };
          }
        }
      }
    } catch (error) {
      throw new ApolloError(
        'Unable to get territory status',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Territory/status', arguments: { root, args }},
      );
    }
  },

  optimize: async (root, { territoryId, start, end }) => {
    try {
      return await terrAsync.optimize(territoryId, start, end);
    } catch (error) {
      throw new ApolloError(
        'Unable to get optimized territory',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Territory/optimize', arguments: { root, territoryId, start, end }},
      );
    }
  },

  lastActivity: async (root, args) => {
    try {
      const territoryId = (root && root.id) || (args && args.territoryId);
      return await terrAsync.lastActivity(territoryId);
    } catch (error) {
      throw new ApolloError(
        'Unable to get last activity',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Territory/lastActivity', arguments: { root, args }},
      );
    }
  },

  lastActivities: async (root, args) => {
    try {
      const { checkout_id } = args || root.status;
      if (!checkout_id) return [];
      return await activityLog.lastActivity(null, checkout_id);
    } catch (error) {
      throw new ApolloError(
        'Unable to get last activities',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Territory/lastActivities', arguments: { root, args }},
      );
    }
  },

  addressCountByTerritories: async (root, { congId }) => {
    try {
      return await terrAsync.addressCountByTerritories(congId);
    } catch (error) {
      throw new ApolloError(
        'Unable to get address count by territories',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Territory/addressCountByTerritories', arguments: { root, congId }},
      );
    }
  },

  phoneCountByTerritories: async (root, { congId }) => {
    try {
      return await terrAsync.phoneCountByTerritories(congId);
    } catch (error) {
      throw new ApolloError(
        'Unable to get phone count by territories',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Territory/phoneCountByTerritories', arguments: { root, congId }},
      );
    }
  },
};

export const mutationResolvers = {
  addTerritory: async (root, { territory }) => {
    try {
      const id = await terrAsync.create(territory);
      return await terrAsync.getTerritory(id);
    } catch (error) {
      throw new ApolloError(
        'Unable to add territory',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Territory/addTerritory', arguments: { root, territory }},
      );
    }
  },
  updateTerritory: async (root, { territory }) => {
    try {
      await terrAsync.update(territory);
      pusher.trigger('foreign-field', 'update-territory', territory);
      return await terrAsync.getTerritory(territory.id);
    } catch (error) {
      throw new ApolloError(
        'Unable to update territory',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Territory/updateTerritory', arguments: { root, territory }},
      );
    }
  },
  deleteTerritory: async( root, { id }) => {
    try {
      await terrAsync.delete(id);
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to delete territory',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Territory/deleteTerritory', arguments: { root, id }},
      );
    }
  },
  checkoutTerritory: async (root, { territoryId, publisherId, user }) => {
    try {
      // check if territory is already checked out
      const existing = await terrAsync.getTerritoryCurrentStatus(territoryId);
      if (existing && existing.length) {
        throw new Error(`Territory ${territoryId} is already checked out`);
      }

      const checkoutId = await terrAsync.saveTerritoryActivity('OUT', territoryId, publisherId, user);
      const publisher = await publisherAsync.getPublisherById(publisherId);
      pusher.trigger('foreign-field', 'checkout-territory', { checkoutId, territoryId, publisher });
      return checkoutId;
    } catch (error) {
      throw new ApolloError(
        'Unable to checkout territory',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'checkoutTerritory', arguments: { root, territoryId, publisherId, user }},
      );
    }
  },
  checkinTerritory: async (root, { territoryId, publisherId, user, checkoutId }) => {
    try {
      const id = await terrAsync.saveTerritoryActivity('IN', territoryId, publisherId, user, checkoutId);
      const publisher = await publisherAsync.getPublisherById(publisherId);
      pusher.trigger('foreign-field', 'checkin-territory', { checkoutId, territoryId, publisher });
      return id;
    } catch (error) {
      throw new ApolloError(
        'Unable to checkin territory',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Territory/checkinTerritory', arguments: {
          root,
          territoryId,
          publisherId,
          user,
          checkoutId,
        }},
      );
    }
  },
  checkinAll: async (root, { congId, username, tz_offset, timezone }) => {
    try {
      await terrAsync.checkinAll(congId, username, tz_offset, timezone);
      pusher.trigger('foreign-field', 'check-in-all', congId);
    } catch (error) {
      throw new ApolloError(
        'Unable to checkin all territories',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'checkinAll', arguments: {
          root,
          congId,
          username,
          tz_offset,
          timezone,
        }},
      );
    }
  },
  copyCheckouts: async (root, { congId, username }) => {
    try {
      await terrAsync.createCampaignCheckouts(congId, username);
      pusher.trigger('foreign-field', 'copy-checkouts', congId);
    } catch (error) {
      throw new ApolloError(
        'Unable to copy checkouts',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'copyCheckouts', arguments: { root, congId, username }},
      );
    }
  },
  reassignCheckout: async(root, { checkoutId, publisherId, user }) => {
    try {
      const territoryId = await terrAsync.reassignCheckout(checkoutId, publisherId, user);
      const publisher = await publisherAsync.getPublisherById(publisherId);
      pusher.trigger('foreign-field', 'reassign-territory', { checkoutId, territoryId, publisher });
      return territoryId;
    } catch (error) {
      throw new ApolloError(
        'Unable to reassign checkout',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'reassignCheckout', arguments: { root, checkoutId, publisherId, user }},
      );
    }
  },
};
