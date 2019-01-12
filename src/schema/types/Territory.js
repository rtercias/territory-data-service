import terrAsync from './../../async/territories';
import { isArray, orderBy, some } from 'lodash';
import { differenceInMonths } from 'date-fns';
import { Publisher } from './Publisher';

const aliases = `,
  congregationid as congregationId
`;

export const Territory = `
  type Territory {
    group_code: String!
    id: Int!
    congregationid: Int!
    name: String
    description: String
    type: String
    addresses: [Address]
    city: String
    status: Status
  }
`;

export const queries = `
  territory(id: Int): Territory
  territories(congId: Int, keyword: String, city: String, group_code: String): [Territory]
  territoriesByCity(congId: Int): [Territory]
  status(territoryId: Int): Status
`;

export const mutations = `
  checkoutTerritory(territoryId: Int!, publisherId: Int!, user: String): Territory
  checkinTerritory(territoryId: Int!, publisherId: Int!, user: String): Territory
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
    } catch (err) {
      console.error(err);
    }
  },

  territories: async (root, args) => {
    try {
      if (root && root.id && args.keyword) {
        return await terrAsync.searchTerritories(root.id, args.keyword);
      }

      if (root && root.id && args.city) {
        return await terrAsync.getTerritoriesByCity(root.id, args.city);
      }

      if (args && args.congId && args.group_code) {
        return await terrAsync.getTerritoriesByGroupCode(args.congId, args.group_code);
      }

      if ((args && args.congId) || (root && root.id)) {
        return await terrAsync.getTerritories(args.congId || root.id);
      }

    } catch (err) {
      console.error(err);
    }
  },

  territoriesByCity: async(root, args) => {
    try {
      if (args.congId) {
        return await terrAsync.getTerritoriesByCity(args.congId);
      }
    } catch (err) {
      console.error(err);
    }
  },

  status: async(root, args) => {
    try {
      if (root && root.congregationid && root.id) {
        let activity = await terrAsync.getTerritoryStatus(root.congregationid, root.id);
        if (activity) {
          // no checkout records found: AVAILABLE
          if (!isArray(activity) || activity.length == 0) {
            return {
              status: 'Available',
            };
          }
          
          // re-order check in/out activity by most recent timestamp
          activity = orderBy(activity, 'timestamp', 'desc');
          // reduce array to the last two records
          activity.length = 2;
          
          // if there is no check IN activity, or the last activity is OUT, then territory is still checked out
          if (!some(activity, ['status', 'IN']) || activity[0].status === 'OUT') {
            const a = activity[0];
            return {
              checkout_id: a.id,
              status: 'Checked Out',
              date: a.timestamp,
              publisherid: a.publisherid,
              territoryid: a.territoryid,
            };
            
          } else if (activity[0].status === 'IN') {
            // if the last activity is IN
            // and the most recent timestamp is two months or less, then the territory is recently worked.
            if (differenceInMonths(new Date(), activity[0].timestamp) <= 2) {
              const a = activity[0];
              return {
                checkout_id: a.id,
                status: 'Recently Worked',
                date: a.timestamp,
                publisherid: a.publisherid,
                territoryid: a.territoryid,
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
    } catch (err) {
      console.error(err);
    }
  },
};

export const mutationResolvers = {
  checkoutTerritory: async (root, { territoryId, publisherId, user }) => {
    await terrAsync.saveTerritoryActivity('OUT', territoryId, publisherId, user);
    await terrAsync.getTerritory(territoryId);
  },
  checkinTerritory: async (root, { territoryId, publisherId, user }) => {
    terrAsync.saveTerritoryActivity('IN', territoryId, publisherId, user);
    await terrAsync.getTerritory(territoryId);
  },
};
