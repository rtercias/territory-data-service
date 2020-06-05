import { toArray } from 'lodash';
import { conn } from '../../index';
import congAsync from '../../async/congregations';

export const Congregation = `
  type Congregation {
    id: Int
    name: String
    description: String
    territories: [Territory]
    publishers: [Publisher]
  }
`;

export const queries = `
  congregation(id: Int!): Congregation
  congregations(keyword: String): [Congregation]
`;

export const resolvers = {
  congregation: async (root, args) => {
    try {
      const congId = args.id || root.congregationid;
      return await congAsync.getCongregationById(congId);
    } catch (err) {
      console.error(err);
    }
  },
  congregations: async (root, args) => {
    try {
      if (args.keyword) {
        return await congAsync.searchCongregations(keyword);
      }

      return await congAsync.getAllCongregations();

    } catch (err) {
      console.error(err);
    }
  }
};
