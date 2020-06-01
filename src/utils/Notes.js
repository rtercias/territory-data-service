import addressAsync from './../async/addresses';

export const Notes = {
  async add(addressId, note, address) {
    const { notes } = address || await addressAsync.getAddress(addressId);
    const notesArray = String(notes || '').split(',');
    const existingNote = notesArray.find(n => String(n).toLowerCase() === String(note).toLowerCase());

    if (existingNote) return existingNote;

    notesArray.push(note);
    return notesArray.join(',');
  },
  async remove(addressId, note, address) {
    const { notes } = address || await addressAsync.getAddress(addressId);
    const notesArray = String(notes || '').split(',');
    const filteredNotes = notesArray.filter(n => String(n).toLowerCase().trim() !== String(note).toLowerCase().trim());
    console.log('filteredNotes', filteredNotes);
    return filteredNotes.join(',');
  }
}
