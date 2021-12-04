import { gql } from 'apollo-server-express';
import terrAsync from './../../async/territories';
import congAsync from './../../async/congregations';
import publisherAsync from './../../async/publishers';
import { isArray, orderBy, some, get } from 'lodash';
import { differenceInCalendarDays } from 'date-fns';
import { ActivityLog } from './ActivityLog';
import { Phone } from './Phone';
import { pusher } from '../../server';
import activityLog from '../../async/activityLog';

const DEFAULT_DAY_LIMIT = 30;

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
    let result;
    if (args.id) {
      result = await terrAsync.getTerritory(args.id);
    }

    if (root && (root.territory_id || root.territoryid)) {
      result = await terrAsync.getTerritory(root.territory_id || root.territoryid);
    }
    return result;
  },

  territories: async (root, args) => {
    if (((root && root.congregationid) || args.congId) && args.keyword) {
      const congId = (root ? root.congregationid : null) || args.congId;
      return await terrAsync.searchTerritories(congId, args.keyword);
    }

    if (args && args.group_id) {
      return await terrAsync.getTerritoriesByGroup(args.group_id);
    }
    
    if (root && root.congregationid && root.username) {
      return await terrAsync.getTerritoriesByUser(root.congregationid, root.username);
    }

    if ((args && args.congId) || (root && root.id)) {
      return await terrAsync.getTerritories(args.congId || root.id);
    }
  },

  status: async(root, args) => {
    const cong = await congAsync.getCongregationById(root.congregationid);
    const congOptions = cong && JSON.parse(cong.options);
    const dayLimit = get(congOptions, 'territories.cycle') || DEFAULT_DAY_LIMIT;

    if (root && root.username) {
      if (root.in === null) {
        return {
          date: root.out, 
          status: 'Checked Out',
        };

      } else if (differenceInCalendarDays(new Date(), root.in) <= dayLimit) {
        return {
          date: root.in,
          status: 'Recently Worked',
        };
      } else {
        return {
          status: 'Available',
        }
      }
    } else if (root && root.congregationid && root.id) {
      let terrStatus;
      terrStatus = await terrAsync.getTerritoryStatus(root.id);

      if (terrStatus) {
        // no checkout records found: AVAILABLE
        if (!isArray(terrStatus) || terrStatus.length == 0) {
          return {
            status: 'Available',
          };
        }

        // if there is no check IN terrStatus, or the last terrStatus is OUT, then territory is still checked out
        if (!some(terrStatus, ['status', 'IN']) || terrStatus[0].status === 'OUT') {
          const a = terrStatus[0];
          return {
            checkout_id: a.checkout_id,
            status: 'Checked Out',
            date: a.timestamp,
            publisherid: a.publisherid,
            territoryid: a.territoryid,
            campaign: a.campaign,
          };
          
        } else if (terrStatus[0].status === 'IN') {
          // if the last terrStatus is IN
          // and the most recent timestamp is 70 days or less, then the territory is recently worked.
          if (differenceInCalendarDays(new Date(), terrStatus[0].timestamp) <= dayLimit) {
            const a = terrStatus[0];
            return {
              checkout_id: a.checkout_id,
              status: 'Recently Worked',
              date: a.timestamp,
              publisherid: a.publisherid,
              territoryid: a.territoryid,
              campaign: a.campaign,
            };
          } else {
            // ... otherwise the territory is available.
            const a = terrStatus[0];
            return {
              checkout_id: a.checkout_id,
              status: 'Available',
              date: a.timestamp,
              publisherid: a.publisherid,
              territoryid: a.territoryid,
              campaign: a.campaign,
            };
          }
        }
      }
    }
  },

  optimize: async (root, { territoryId, start, end }) => {
    return await terrAsync.optimize(territoryId, start, end);
  },

  lastActivity: async (root, args) => {
    const territoryId = (root && root.id) || (args && args.territoryId);
    return await terrAsync.lastActivity(territoryId);
  },

  lastActivities: async (root, args) => {
    const { checkout_id } = args || root.status;
    if (!checkout_id) return [];
    return await activityLog.lastActivity(null, checkout_id);
  },

  addressCountByTerritories: async (root, { congId }) => {
    return await terrAsync.addressCountByTerritories(congId);
  },

  phoneCountByTerritories: async (root, { congId }) => {
    return await terrAsync.phoneCountByTerritories(congId);
  },
};

export const mutationResolvers = {
  addTerritory: async (root, { territory }) => {
    const id = await terrAsync.create(territory);
    return await terrAsync.getTerritory(id);
  },
  updateTerritory: async (root, { territory }) => {
    await terrAsync.update(territory);
    pusher.trigger('foreign-field', 'update-territory', territory);
    return await terrAsync.getTerritory(territory.id);
  },
  deleteTerritory: async( root, { id }) => {
    await terrAsync.delete(id);
    return true;
  },
  checkoutTerritory: async (root, { territoryId, publisherId, user }) => {
    // check if territory is already checked out
    const existing = await terrAsync.getTerritoryCurrentStatus(territoryId);
    if (existing && existing.length) {
      throw new Error(`Territory ${territoryId} is already checked out`);
    }

    const checkoutId = await terrAsync.saveTerritoryActivity('OUT', territoryId, publisherId, user);
    const publisher = await publisherAsync.getPublisherById(publisherId);
    pusher.trigger('foreign-field', 'checkout-territory', { checkoutId, territoryId, publisher });
    return checkoutId;
  },
  checkinTerritory: async (root, { territoryId, publisherId, user }) => {
    const checkoutId = await terrAsync.saveTerritoryActivity('IN', territoryId, publisherId, user);
    const publisher = await publisherAsync.getPublisherById(publisherId);
    pusher.trigger('foreign-field', 'checkin-territory', { checkoutId, territoryId, publisher });
    return checkoutId;
  },
  checkinAll: async (root, { congId, username, tz_offset, timezone, campaign }) => {
    await terrAsync.checkinAll(congId, username, tz_offset, timezone, campaign);
    pusher.trigger('foreign-field', 'check-in-all', congId);
  },
  copyCheckouts: async (root, { congId, username, campaign }) => {
    await terrAsync.createCampaignCheckouts(congId, username, campaign);
    pusher.trigger('foreign-field', 'copy-checkouts', congId);
  },
  reassignCheckout: async(root, { checkoutId, publisherId, user }) => {
    const territoryId = await terrAsync.reassignCheckout(checkoutId, publisherId, user);
    const publisher = await publisherAsync.getPublisherById(publisherId);
    pusher.trigger('foreign-field', 'reassign-territory', { checkoutId, territoryId, publisher });
    return territoryId;
  },
};
