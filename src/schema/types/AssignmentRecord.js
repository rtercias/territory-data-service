import { ApolloError, gql } from 'apollo-server-express';
import reportsAsync from '../../async/reports';

export const AssignmentRecord = gql`
  type AssignmentRecord {
    territory_id: Int!
    territory_name: String!
    territory_description: String
    publisher_id: Int!
    publisher_name: String
    out: String
    in: String
    timestamp: String
    congregationid: Int!
    username: String
    campaign: Boolean
    type: String
  }
`;

export const resolvers = {
  getAssignmentRecords: async (root, args) => {
    try {
      const congId = args.congId;
      const campaignMode = args.campaignMode;
      return await reportsAsync.getAssignmentRecords(congId, campaignMode);
    } catch (error) {
      throw new ApolloError(
        'Unable to get assignment records',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'AssignmentRecord/getAssignmentRecords', arguments: { root, args }},
      );
    }
  },
};
