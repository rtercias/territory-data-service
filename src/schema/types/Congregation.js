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
    groups: [Group]
    language: String
    campaign: Boolean
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
    create_user: Int
    update_user: Int
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
};

export const mutationResolvers = {
  addCongregation: async (root, { cong }) => {
    const id = await congAsync.create(cong);
    return await congAsync.getCongregationById(id);
  },
  updateCongregation: async (root, { cong }) => {
    try {
      await congAsync.update(cong);
      pusher.trigger('foreign-field', 'update-cong', cong);
      return await congAsync.getCongregationById(cong.id);
    } catch (err) {
      console.error(err);
    }
  },
  deleteCongregation: async( root, { id }) => {
    try {
      await congAsync.delete(id);
      return true;
    } catch (err) {
      console.error(err);
    }
  },
};