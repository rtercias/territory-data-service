import { gql } from 'apollo-server-express';
import changeLogAsync from '../../async/changeLog';

export const AddressChangeLog = gql`
  type AddressChangeLog {
    id: Int
    publisher_id: Int
    date: String
    table_name: String
    record_id: Int
    changes: String
  }
`;

export const resolvers = {
  addressChangeLogs: async (root, {recordId, minDate }) => {
    try {
      return await changeLogAsync.read('addresses', recordId, minDate);
    } catch (err) {
      console.error(err);
    }
  },
};
