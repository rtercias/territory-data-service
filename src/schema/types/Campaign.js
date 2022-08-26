import { gql } from 'apollo-server-express';
import {
  getCurrentCampaign,
  getHistoricalCampaigns,
  startCampaign,
  endCampaign,
  updateCampaign,
} from '../../async/campaigns';

export const Campaign = gql`
  type Campaign {
    id: Int
    name: String
    congregation_id: Int
    publisher_id: Int
    start_date: String
    end_date: String
  }
`;

export const queryResolvers = {
  campaign: async (root) => {
    try {
      return await getCurrentCampaign(root.id);
    } catch (error) {
      throw new ApolloError(
        'Unable to get current campaign',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Campaign/currentCampaign', arguments: { root } },
      );
    }
  },
  historicalCampaigns: async (root) => {
    try {
      return await getHistoricalCampaigns(root.id);
    } catch (error) {
      throw new ApolloError(
        'Unable to get historical campaigns',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Campaign/historicalCampaigns', arguments: { root } },
      );
    }
  },
};

export const mutationResolvers = {
  startCampaign: async (root, { name, congId, publisherId }) => {
    try {
      await startCampaign(name, congId, publisherId);
      return await getCurrentCampaign(congId);
    } catch (error) {
      throw new ApolloError(
        'Unable to start campaign',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Campaign/startCampaign', arguments: { root, name, congId, publisherId } },
      );
    }
  },
  updateCampaign: async (root, { campaignId, name, start_date, end_date }) => {
    try {
      return await updateCampaign(campaignId, name, start_date, end_date);
    } catch (error) {
      throw new ApolloError(
        'Unable to update campaign',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Campaign/updateCampaign', arguments: { root, campaignId, name, start_date, end_dates } },
      );
    }
  },
  endCampaign: async (root, { campaignId }) => {
    try {
      return await endCampaign(campaignId);
    } catch (error) {
      throw new ApolloError(
        'Unable to end campaign',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Campaign/endCampaign', arguments: { root, campaignId } },
      );
    }
  },
}
