import { gql } from 'apollo-server-express';
import reportsAsync from '../../async/reports';

export const AssignmentRecord = gql`
  type AssignmentRecord {
    territory_id: Int!
    territory_name: String!
    publisher_id: Int!
    publisher_name: String!
    out: String
    in: String
    timestamp: String
    congregationid: Int!
    username: String
  }
`;

export const resolvers = {
  getAssignmentRecords: async (root, args) => {
    try {
      const congId = args.congId;
      return await reportsAsync.getAssignmentRecords(congId);
    } catch (err) {
      console.error(err);
    }
  },
};
