import { gql } from 'apollo-server-express';
import { pusher } from '../../server';
import congAsync from '../../async/congregations';
import groupAsync from '../../async/groups';

export const Congregation = gql`
  type Congregation {
    id: Int
    name: String
    description: String
    territories: [Territory]
    publishers: [Publisher]
    groups: [String]
    language: String
    campaign: Int
    admin_email: String
    options: String
  }
`;

export const CongregationInput = gql`
  input CongregationInput {
    id: Int
    name: String
    description: String
    language: String
    campaign: Int
    admin_email: String
    options: String
  }
`;

export const queryResolvers = {
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
  },
  groups: async (root, args) => {
    try {
      if (root && root.groups) {
        return root.groups;

      } else if (root.id) {
        const groups = await groupAsync.getGroups(root.id) || [];
        return groups.map(g => g.code);
      }
    } catch (err) {
      console.error(err);
    }
  },
};

export const mutationResolvers = {
  updateCongregation: async (root, { cong }) => {
    try {
      await congAsync.update(cong);
      pusher.trigger('foreign-field', 'update-cong', cong);
      return await congAsync.getCongregationById(cong.id);
    } catch (err) {
      console.error(err);
    }
  },
};