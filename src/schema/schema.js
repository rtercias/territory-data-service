import { gql } from 'apollo-server-express';
import { merge } from 'lodash';

import {
  Address,
  AddressInput,
  queryResolvers as addressQueryResolvers,
  mutationResolvers as addressMutationResolvers,
} from './types/Address';
import { 
  Congregation,
  CongregationInput,
  queryResolvers as congregationQueryResolvers,
  mutationResolvers as congregationMutationResolvers,
} from './types/Congregation';
import { 
  Group,
  GroupInput,
  queryResolvers as groupQueryResolvers,
  mutationResolvers as groupMutationResolvers,
} from './types/Group';
import { 
  Territory,
  TerritoryInput,
  queryResolvers as territoryQueryResolvers,
  mutationResolvers as territoryMutationResolvers,
} from './types/Territory';
import {
  Publisher,
  PublisherInput,
  queryResolvers as publisherQueryResolvers,
  mutationResolvers as publisherMutationResolvers,
} from './types/Publisher';
import { Status } from './types/Status';
import {
  ActivityLog, 
  ActivityLogInput,
  resolvers as activityLogResolvers,
  mutationResolvers as activityLogMutationResolvers,
} from './types/ActivityLog';
import {
  AssignmentRecord,
  resolvers as assignmentRecordResolvers,
} from './types/AssignmentRecord';
import {
  AddressChangeLog,
  resolvers as changeLogResolvers,
} from './types/AddressChangeLog';
import {
  Phone,
  PhoneInput,
  queryResolvers as phoneQueryResolvers,
  mutationResolvers as phoneMutationResolvers,
} from './types/Phone';

const RootQuery = gql`
  type RootQuery {
    user(username: String): Publisher
    publisher(firstname: String, lastname: String, publisherId: Int, congId: Int): Publisher
    publishers(congId: Int, keyword: String): [Publisher]
    creator: Publisher
    updater: Publisher
    congregation(id: Int!): Congregation
    congregations(keyword: String): [Congregation]
    territory(id: Int): Territory
    territories(congId: Int, keyword: String, group_id: Int): [Territory]
    status(territoryId: Int): Status
    address(id: Int, status: String): Address
    addresses(congId: Int, terrId: Int, keyword: String, status: String): [Address]
    inactiveAddresses(congId: Int, terrId: Int, keyword: String): [Address]
    dnc(congId: Int, keyword: String): [Address]
    activityLog(id: Int): ActivityLog
    activityLogs(checkout_id: Int, address_id: Int): [ActivityLog]
    getAssignmentRecords(congId: Int, campaignMode: Boolean): [AssignmentRecord]
    optimize(territoryId: Int!, start: Float, end: Float): [Address],
    lastActivity(territoryId: Int, addressId: Int, checkoutId: Int): ActivityLog,
    lastActivities(checkout_id: Int!): [ActivityLog],
    nearestAddresses(congId: Int, coordinates: [Float], radius: Int, unit: String, skip: Int, take: Int): [Address],
    group(id: Int): Group,
    groups(congId: Int): [Group],
    addressChangeLogs(congId: Int, recordId: Int, minDate: String, publisherId: Int): [AddressChangeLog],
    phone(id: Int, status: String): Phone,
    phones(congId: Int, parentId: Int, terrId: Int, keyword: String): [Phone],
    addressCountByTerritories(congId: Int): [Territory],
    phoneCountByTerritories(congId: Int): [Territory],
  }
`;

const Mutation = gql`
  type Mutation {
    checkoutTerritory(territoryId: Int!, publisherId: Int!, user: String): Int
    checkinTerritory(territoryId: Int!, publisherId: Int!, user: String): Int
    checkinAll(congId: Int!, username: String!, tz_offset: String!, timezone: String!, campaign: Boolean): Boolean
    copyCheckouts(congId: Int!, username: String!, campaign: Boolean): Boolean
    reassignCheckout(checkoutId: Int!, publisherId: Int!, user: String!): Boolean
    addAddress(address: AddressInput!): Address
    updateAddress(address: AddressInput!): Address
    deleteAddress(id: Int!): Boolean
    updateSort(addressIds: [Int]!, userid: Int): Boolean
    changeAddressStatus(addressId: Int!, status: String!, userid: Int!, note: String): Boolean
    addNote(addressId: Int!, userid: Int!, note: String!): Boolean
    removeNote(addressId: Int!, userid: Int!, note: String!): Boolean
    addLog(activityLog: ActivityLogInput): ActivityLog
    updateLog(activityLog: ActivityLogInput): ActivityLog
    removeLog(id: Int!): Boolean
    addPhone(phone: PhoneInput!): Phone
    updatePhone(phone: PhoneInput!): Phone
    updatePhoneSort(phoneIds: [Int]!, userid: Int): Boolean
    changePhoneStatus(phoneId: Int!, status: String!, userid: Int!, note: String): Boolean
    addPhoneTag(phoneId: Int!, userid: Int!, note: String!): Boolean
    removePhoneTag(phoneId: Int!, userid: Int!, note: String!): Boolean
    resetTerritoryActivity(checkout_id: Int!, userid: Int!, tz_offset: String, timezone: String): Boolean
    addCongregation(cong: CongregationInput!): Congregation
    updateCongregation(cong: CongregationInput!): Congregation
    deleteCongregation(id: Int!): Boolean
    addTerritory(territory: TerritoryInput!): Territory
    updateTerritory(territory: TerritoryInput!): Territory
    deleteTerritory(id: Int!): Boolean
    addGroup(group: GroupInput!): Group
    updateGroup(group: GroupInput!): Group
    deleteGroup(id: Int!): Boolean
    addPublisher(publisher: PublisherInput!): Publisher
    updatePublisher(publisher: PublisherInput!): Publisher
    deletePublisher(id: Int!): Boolean
  }
`;

const SchemaDefinition = gql`
  schema {
    query: RootQuery
    mutation: Mutation
  }
`;

export const resolvers = {
  RootQuery: merge (
    {}, 
    publisherQueryResolvers,
    congregationQueryResolvers,
    territoryQueryResolvers,
    addressQueryResolvers,
    activityLogResolvers,
    assignmentRecordResolvers,
    changeLogResolvers,
    phoneQueryResolvers,
    groupQueryResolvers,
  ),

  Mutation: merge (
    {},
    publisherMutationResolvers,
    territoryMutationResolvers,
    activityLogMutationResolvers,
    addressMutationResolvers,
    phoneMutationResolvers,
    congregationMutationResolvers,
    groupMutationResolvers,
  ),

  Publisher: {
    congregation: congregationQueryResolvers.congregation,
    territories: territoryQueryResolvers.territories,
  },

  Congregation: {
    territories: territoryQueryResolvers.territories,
    publishers: publisherQueryResolvers.publishers,
    groups: groupQueryResolvers.groups,
  },

  Territory: {
    addresses: addressQueryResolvers.addresses,
    inactiveAddresses: addressQueryResolvers.inactiveAddresses,
    status: territoryQueryResolvers.status,
    lastActivity: territoryQueryResolvers.lastActivity,
    lastActivities: territoryQueryResolvers.lastActivities,
    phones: phoneQueryResolvers.phones,
    group: groupQueryResolvers.group,
  },

  Address: {
    congregation: congregationQueryResolvers.congregation,
    territory: territoryQueryResolvers.territory,
    activityLogs: activityLogResolvers.activityLogs,
    creator: publisherQueryResolvers.creator,
    updater: publisherQueryResolvers.updater,
    lastActivity: activityLogResolvers.lastActivity,
    phones: phoneQueryResolvers.phones,
  },

  Status: {
    publisher: publisherQueryResolvers.publisher,
    territory: territoryQueryResolvers.territory,
  },

  AddressChangeLog: {
    publisher: publisherQueryResolvers.publisher,
    address: addressQueryResolvers.address,
  },

  Phone: {
    territory: territoryQueryResolvers.territory,
    address: addressQueryResolvers.address,
    activityLogs: activityLogResolvers.activityLogs,
    creator: publisherQueryResolvers.creator,
    updater: publisherQueryResolvers.updater,
    lastActivity: activityLogResolvers.lastActivity,
  },
}

export const typeDefs = [
  SchemaDefinition,
  RootQuery,
  Mutation,
  Congregation,
  CongregationInput,
  Territory,
  TerritoryInput,
  Publisher,
  PublisherInput,
  Address,
  AddressInput,
  Status,
  ActivityLog,
  ActivityLogInput,
  AssignmentRecord,
  AddressChangeLog,
  Phone,
  PhoneInput,
  Group,
  GroupInput,
];
