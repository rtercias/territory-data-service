import { gql } from 'apollo-server-express';
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
      const { id, congId, code } = args;
      const result = await groupAsync.get(id, congId, code);
      return result;
    } catch (err) {
      console.error(err);
    }
  },
  groups: async (root, args) => {
    try {
      if (args.congId) {
        return await groupAsync.getAll(args.congId);
      }
      return await groupAsync.getGroups(root.id);
    } catch (err) {
      console.error(err);
    }
  },
};

export const mutationResolvers = {
  addGroup: async (root, { group }) => {
    const id = await groupAsync.create(group);
    return await groupAsync.get(id);
  },
  updateGroup: async (root, { group }) => {
    try {
      await groupAsync.update(group);
      pusher.trigger('foreign-field', 'update-group', group);
      return await groupAsync.get(group.id);
    } catch (err) {
      console.error(err);
    }
  },
  deleteGroup: async( root, { id }) => {
    try {
      await groupAsync.delete(id);
      return true;
    } catch (err) {
      console.error(err);
    }
  },
};