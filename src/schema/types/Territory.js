import { gql } from 'apollo-server-express';
import terrAsync from './../../async/territories';
import { isArray, orderBy, some } from 'lodash';
import { differenceInMonths } from 'date-fns';
import { ActivityLog } from './ActivityLog';
import { Phone } from './Phone';
import { pusher } from '../../server';

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
    phones: [Phone]
    tags: String
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
    if (root && root.username) {
      if (root.in === null) {
        return {
          date: root.out, 
          status: 'Checked Out',
        };

      } else if (differenceInMonths(new Date(), root.in) <= 1) {
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
      terrStatus = await terrAsync.getTerritoryStatus(root.congregationid, root.id);
      

      if (terrStatus) {
        // no checkout records found: AVAILABLE
        if (!terrStatus) {
          return {
            status: 'Available',
          };
        }

        // if there is no check IN terrStatus, or the last terrStatus is OUT, then territory is still checked out
        if (!terrStatus.in) {
          return {
            checkout_id: terrStatus.checkout_id,
            status: 'Checked Out',
            date: terrStatus.timestamp,
            publisherid: terrStatus.publisher_id,
            territoryid: terrStatus.territory_id,
            campaign: terrStatus.campaign,
          };
          
        } else {
          // if the last terrStatus is IN
          // and the most recent timestamp is one month or less, then the territory is recently worked.
          if (differenceInMonths(new Date(), terrStatus.timestamp) <= 1) {
            return {
              checkout_id: terrStatus.checkout_id,
              status: 'Recently Worked',
              date: terrStatus.timestamp,
              publisherid: terrStatus.publisher_id,
              territoryid: terrStatus.territory_id,
              campaign: terrStatus.campaign,
            };
          } else {
            // ... otherwise the territory is available.
            return {
              status: 'Available',
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
    return await terrAsync.saveTerritoryActivity('OUT', territoryId, publisherId, user);
  },
  checkinTerritory: async (root, { territoryId, publisherId, user }) => {
    return await terrAsync.saveTerritoryActivity('IN', territoryId, publisherId, user);
  },
  checkinAll: async (root, { congId, username, tz_offset, timezone, campaign }) => {
    await terrAsync.checkinAll(congId, username, tz_offset, timezone, campaign);
    pusher.trigger('foreign-field', 'check-in-all', congId);
  },
  copyCheckouts: async (root, { congId, username, campaign }) => {
    await terrAsync.createCampaignCheckouts(congId, username, campaign);
    pusher.trigger('foreign-field', 'copy-checkouts', congId);
  },
};
