import { gql } from 'apollo-server-express';
import changeLogAsync from '../../async/changeLog';

export const AddressChangeLog = gql`
  type AddressChangeLog {
    id: Int
    publisher: Publisher
    date: String
    table_name: String
    record_id: Int
    address: Address
    changes: String
  }
`;

export const resolvers = {
  addressChangeLogs: async (root, { congId, recordId, minDate, publisherId }) => {
    try {
      return await changeLogAsync.getAddressChangeLog(congId, recordId, minDate, publisherId);
    } catch (err) {
      console.error(err);
    }
  },
};
