import { gql } from 'apollo-server-express';

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
