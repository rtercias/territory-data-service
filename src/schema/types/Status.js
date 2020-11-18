import { gql } from 'apollo-server-express';

export const Status = gql`
  type Status {
    checkout_id: Int
    status: String
    date: String
    publisherid: Int
    publisher: Publisher
    territoryid: Int
    territory: Territory
    campaign: Boolean
  }
`;
