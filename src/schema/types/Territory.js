import terrAsync from './../../async/territories';
import { isArray, orderBy, some } from 'lodash';
import { differenceInMonths } from 'date-fns';

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
    inactiveAddresses: [Address]
    city: String
    status: Status
  }
`;

export const queries = `
  territory(id: Int): Territory
  territories(congId: Int, keyword: String, city: String, group_code: String): [Territory]
  territoriesByCity(congId: Int): [Territory]
  status(territoryId: Int): Status
  city: String
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
      
      if (root && root.congregationid && root.username) {
        return await terrAsync.getTerritoriesByUser(root.congregationid, root.username);
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
      if (root && root.username) {
        if (root.in === null) {
          return {
            date: root.out, 
            status: 'Checked Out',
          };

        } else if (differenceInMonths(new Date(), root.in) <= 2) {
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
          if (!isArray(terrStatus) || terrStatus.length == 0) {
            return {
              status: 'Available',
            };
          }
          
          // re-order check in/out terrStatus by most recent timestamp
          terrStatus = orderBy(terrStatus, 'timestamp', 'desc');
          // reduce array to the last two records
          terrStatus.length = 2;
          
          // if there is no check IN terrStatus, or the last terrStatus is OUT, then territory is still checked out
          if (!some(terrStatus, ['status', 'IN']) || terrStatus[0].status === 'OUT') {
            const a = terrStatus[0];
            return {
              checkout_id: a.id,
              status: 'Checked Out',
              date: a.timestamp,
              publisherid: a.publisherid,
              territoryid: a.territoryid,
            };
            
          } else if (terrStatus[0].status === 'IN') {
            // if the last terrStatus is IN
            // and the most recent timestamp is two months or less, then the territory is recently worked.
            if (differenceInMonths(new Date(), terrStatus[0].timestamp) <= 2) {
              const a = terrStatus[0];
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

  city: async(root) => {
    try {
      if (root && root.city) {
        return root.city;

      } else if (root.id) {
        const result = await terrAsync.getTerritoriesByCity(root.congregationid, null, root.id);
        if (result.length) {
          return result[0].city;
        }
      }

      return null;
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
