import { makeExecutableSchema } from 'graphql-tools';
import { merge } from 'lodash';
import { Address, queries as addressQueries, resolvers as addressResolvers } from './types/Address';
import { Congregation, queries as congregationQueries, resolvers as congregationResolvers } from './types/Congregation';
import { 
  Territory, 
  queries as territoryQueries, 
  mutations as territoryMutations, 
  queryResolvers as territoryQueryResolvers, 
  mutationResolvers as territoryMutationResolvers 
} from './types/Territory';
import { Publisher, queries as publisherQueries, queryResolvers as publisherQueryResolvers } from './types/Publisher';
import { Status } from './types/Status';
import {
  ActivityLog, 
  ActivityLogInput,
  queries as activityLogQueries,
  mutations as activityLogMutations,
  resolvers as activityLogResolvers,
  mutationResolvers as activityLogMutationResolvers,
} from './types/ActivityLog';
import {
  AssignmentRecord,
  queries as assignmentRecordQueries,
  resolvers as assignmentRecordResolvers,
} from './types/AssignmentRecord';

const RootQuery = `
  type RootQuery {
    user(username: String): Publisher
    publisher(firstname: String, lastname: String): Publisher
    ${publisherQueries}
    ${congregationQueries}
    ${territoryQueries}
    ${addressQueries}
    ${activityLogQueries}
    ${assignmentRecordQueries}
  }
`;

const Mutation = `
  type Mutation {
    ${territoryMutations}
    ${activityLogMutations}
  }
`;

const SchemaDefinition = `
  schema {
    query: RootQuery
    mutation: Mutation
  }
`;

const resolvers = {
  RootQuery: merge (
    {}, 
    publisherQueryResolvers,
    congregationResolvers,
    territoryQueryResolvers,
    addressResolvers,
    activityLogResolvers,
    assignmentRecordResolvers,
  ),

  Mutation: merge (
    {},
    territoryMutationResolvers,
    activityLogMutationResolvers,
  ),

  Publisher: {
    congregation: congregationResolvers.congregation,
    territories: territoryQueryResolvers.territories,
  },

  Congregation: {
    territories: territoryQueryResolvers.territories,
    publishers: publisherQueryResolvers.publishers
  },

  Territory: {
    addresses: addressResolvers.addresses,
    status: territoryQueryResolvers.status,
    city: territoryQueryResolvers.city,
  },

  Address: {
    territory: territoryQueryResolvers.territory,
    activityLogs: activityLogResolvers.activityLogs,
  },

  Status: {
    publisher: publisherQueryResolvers.publisher,
    territory: territoryQueryResolvers.territory,
  }
}

export default makeExecutableSchema({
  typeDefs: [
    SchemaDefinition,
    RootQuery,
    Mutation,
    Congregation,
    Territory,
    Publisher,
    Address,
    Status,
    ActivityLog,
    ActivityLogInput,
    AssignmentRecord,
  ],
  resolvers,
});
