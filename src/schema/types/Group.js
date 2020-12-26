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
    const id = args.id || root.group_id;
    const result = await groupAsync.get(id);
    return result;
  },
  groups: async (root, args) => {
    if (args.congId) {
      return await groupAsync.getAll(args.congId);
    }
    return await groupAsync.getGroups(root.id);
  },
};

export const mutationResolvers = {
  addGroup: async (root, { group }) => {
    const id = await groupAsync.create(group);
    return await groupAsync.get(id);
  },
  updateGroup: async (root, { group }) => {
    await groupAsync.update(group);
    pusher.trigger('foreign-field', 'update-group', group);
    return await groupAsync.get(group.id);
  },
  deleteGroup: async( root, { id }) => {
    await groupAsync.delete(id);
    return true;
  },
};