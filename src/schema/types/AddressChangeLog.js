import { ApolloError, gql } from 'apollo-server-express';
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
    parent_id: Int
  }
`;

export const resolvers = {
  addressChangeLogs: async (root, { congId, recordId, minDate, publisherId }) => {
    try {
      return await changeLogAsync.getAddressChangeLog(congId, recordId, minDate, publisherId);
    } catch (error) {
      throw new ApolloError(
        'Unable to get address change logs',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'AddressChangeLog/addressChangeLogs', arguments: {
          root,
          congId,
          recordId,
          minDate,
          publisherId,
        }},
      );
    }
  },
};
