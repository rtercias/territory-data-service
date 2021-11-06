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
    circuit: String
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
    circuit: String
    create_user: Int
    update_user: Int
  }
`;

export const queryResolvers = {
  congregation: async (root, args) => {
    const congId = args.id || root.congregationid;
    return await congAsync.getCongregationById(congId);
  },
  congregations: async (root, args) => {
    if (args.keyword) {
      return await congAsync.searchCongregations(args.keyword);
    }

    return await congAsync.getAllCongregations();
  },
};

export const mutationResolvers = {
  addCongregation: async (root, { cong }) => {
    const id = await congAsync.create(cong);
    return await congAsync.getCongregationById(id);
  },
  updateCongregation: async (root, { cong }) => {
    await congAsync.update(cong);
    pusher.trigger('foreign-field', 'update-cong', cong);
    return await congAsync.getCongregationById(cong.id);
  },
  deleteCongregation: async( root, { id }) => {
    await congAsync.delete(id);
    return true;
  },
};