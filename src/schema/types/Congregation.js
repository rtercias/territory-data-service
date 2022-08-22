import { ApolloError, gql } from 'apollo-server-express';
import { pusher } from '../../server';
import congAsync from '../../async/congregations';

// NOTE: congregation's campaign field is DEPRECATED.
// Use the derived object currentCampaign instead
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
    currentCampaign: Campaign
    historicalCampaigns: [Campaign]
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
    try {
      const congId = args.id || root.congregationid;
      return await congAsync.getCongregationById(congId);
    } catch (error) {
      throw new ApolloError(
        'Unable to get congregation',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Congregation/congregation', arguments: { root, args }},
      );
    }
  },
  congregations: async (root, args) => {
    try {
      if (args.keyword) {
        return await congAsync.searchCongregations(args.keyword);
      }

      return await congAsync.getAllCongregations();
    } catch (error) {
      throw new ApolloError(
        'Unable to get congregations',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Congregation/congregations', arguments: { root, args }},
      );
    }
  },
};

export const mutationResolvers = {
  addCongregation: async (root, { cong }) => {
    try {
      const id = await congAsync.create(cong);
      return await congAsync.getCongregationById(id);
    } catch (error) {
      throw new ApolloError(
        'Unable to add congregation',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Congregation/addCongregation', arguments: { root, cong }},
      );
    }
  },
  updateCongregation: async (root, { cong }) => {
    try {
      await congAsync.update(cong);
      pusher.trigger('foreign-field', 'update-cong', cong);
      return await congAsync.getCongregationById(cong.id);
    } catch (error) {
      throw new ApolloError(
        'Unable to update congregation',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Congregation/updateCongregation', arguments: { root, cong }},
      );
    }
  },
  deleteCongregation: async( root, { id }) => {
    try {
      await congAsync.delete(id);
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to delete congregation',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Congregation/deleteCongregation', arguments: { root, id } },
      );
    }
  },
};
