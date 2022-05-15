import { ApolloError, gql } from 'apollo-server-express';
import { pusher } from '../../server';
import groupAsync from '../../async/groups';

export const Group = gql`
  type Group {
    id: Int
    congregation_id: Int
    code: String
    description: String
    overseer: Int
  }
`;

export const GroupInput = gql`
  input GroupInput {
    id: Int
    congregation_id: Int
    code: String
    description: String
    overseer: Int
  }
`;

export const queryResolvers = {
  group: async (root, args) => {
    try {
      const id = args.id || root.group_id;
      const result = await groupAsync.get(id);
      return result;
    } catch (error) {
      throw new ApolloError(
        'Unable to get group',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Group/group', arguments: { root, args }},
      );
    }
  },
  groups: async (root, args) => {
    try {
      if (args.congId) {
        return await groupAsync.getAll(args.congId);
      }
      return await groupAsync.getGroups(root.id);
    } catch (error) {
      throw new ApolloError(
        'Unable to get groups',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Group/groups', arguments: { root, args }},
      );
    }
  },
};

export const mutationResolvers = {
  addGroup: async (root, { group }) => {
    try {
      const id = await groupAsync.create(group);
      return await groupAsync.get(id);
    } catch (error) {
      throw new ApolloError(
        'Unable to add group',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Group/addGroup', arguments: { root, group }},
      );
    }
  },
  updateGroup: async (root, { group }) => {
    try {
      await groupAsync.update(group);
      pusher.trigger('foreign-field', 'update-group', group);
      return await groupAsync.get(group.id);
    } catch (error) {
      throw new ApolloError(
        'Unable to update group',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Group/updateGroup', arguments: { root, group }},
      );
    }
  },
  deleteGroup: async( root, { id }) => {
    try {
      await groupAsync.delete(id);
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to delete group',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Group/deleteGroup', arguments: { root, id }},
      );
    }
  },
};
