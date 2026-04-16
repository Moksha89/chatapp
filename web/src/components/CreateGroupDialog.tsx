import { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Checkbox } from './ui/checkbox';
import { Users, Search, Camera, Shield, Hash, Globe, X, Info } from 'lucide-react';

interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_GROUP_MEMBERS = 1024;
const MAX_DESCRIPTION_LENGTH = 2048;

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { createGroupChat, selectChat } = useChat();
  const { user: currentUser } = useAuth();
  const [step, setStep] = useState<'info' | 'members'>('info');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupType, setGroupType] = useState<'group' | 'channel' | 'community'>('group');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [groupIconPreview, setGroupIconPreview] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      api.getAllUsers().then(results => {
        setAllUsers(results.filter((u: User) => u.id !== currentUser?.id));
      }).catch(error => {
        console.error('Failed to load users:', error);
      }).finally(() => setIsLoading(false));
      setGroupName('');
      setGroupDescription('');
      setGroupType('group');
      setSelectedUsers([]);
      setStep('info');
      setMemberSearch('');
      setGroupIconPreview(null);
    }
  }, [open, currentUser?.id]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : prev.length < MAX_GROUP_MEMBERS - 1
          ? [...prev, userId]
          : prev
    );
  };

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setGroupIconPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const newChat = await createGroupChat(groupName, selectedUsers, groupDescription);
      selectChat(newChat);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = memberSearch
    ? allUsers.filter(u =>
        u.displayName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        u.phoneNumber.includes(memberSearch)
      )
    : allUsers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'info' ? 'New Group' : 'Add Participants'}
          </DialogTitle>
          <DialogDescription>
            {step === 'info'
              ? 'Set up your group details'
              : `Select participants (${selectedUsers.length}/${MAX_GROUP_MEMBERS - 1})`}
          </DialogDescription>
        </DialogHeader>

        {step === 'info' ? (
          <div className="space-y-4">
            {/* Group Icon */}
            <div className="flex items-center gap-4">
              <div
                className="relative w-16 h-16 rounded-full bg-[#246BFD]/10 flex items-center justify-center cursor-pointer hover:bg-[#246BFD]/20 transition-colors overflow-hidden"
                onClick={() => iconInputRef.current?.click()}
              >
                {groupIconPreview ? (
                  <img src={groupIconPreview} alt="Group icon" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-[#246BFD]" />
                )}
                <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconSelect} />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Group Name *</label>
                <Input
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>

            {/* Group Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Group Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'group' as const, icon: Users, label: 'Group', desc: 'Everyone can message' },
                  { type: 'channel' as const, icon: Hash, label: 'Channel', desc: 'Admins broadcast' },
                  { type: 'community' as const, icon: Globe, label: 'Community', desc: 'Sub-groups & topics' },
                ].map(({ type, icon: Icon, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setGroupType(type)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      groupType === type
                        ? 'border-[#246BFD] bg-[#246BFD]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${groupType === type ? 'text-[#246BFD]' : 'text-gray-400'}`} />
                    <p className={`text-xs font-medium ${groupType === type ? 'text-[#246BFD]' : 'text-gray-700'}`}>{label}</p>
                    <p className="text-[10px] text-gray-400">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Description</label>
                <span className={`text-[10px] ${groupDescription.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
                  {groupDescription.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <textarea
                placeholder="What is this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                className="w-full px-3 py-2 border rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-[#246BFD]/20 focus:border-[#246BFD]"
                rows={3}
              />
            </div>

            {/* Member Limit Info */}
            <div className="flex items-center gap-2 p-2.5 bg-[#246BFD]/5 rounded-xl">
              <Info className="h-4 w-4 text-[#246BFD] flex-shrink-0" />
              <p className="text-xs text-gray-600">
                {groupType === 'group' && `Groups can have up to ${MAX_GROUP_MEMBERS} members`}
                {groupType === 'channel' && 'Channels support unlimited subscribers. Only admins can post.'}
                {groupType === 'community' && 'Communities can contain multiple groups and channels.'}
              </p>
            </div>

            <Button
              className="w-full bg-[#246BFD] hover:bg-[#1A56DB]"
              onClick={() => setStep('members')}
              disabled={!groupName.trim()}
            >
              Next: Add Participants
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Selected chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {selectedUsers.map(uid => {
                  const u = allUsers.find(a => a.id === uid);
                  return (
                    <span key={uid} className="bg-[#246BFD]/10 text-[#246BFD] text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
                      {u?.displayName.slice(0, 12) || 'User'}
                      <button onClick={() => toggleUser(uid)} className="hover:bg-[#246BFD]/20 rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Member Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Member limit indicator */}
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{selectedUsers.length} of {MAX_GROUP_MEMBERS - 1} selected</span>
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#246BFD] rounded-full transition-all"
                  style={{ width: `${(selectedUsers.length / (MAX_GROUP_MEMBERS - 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* User list */}
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded-xl p-2">
              {isLoading && (
                <p className="text-center text-gray-500 py-4">Loading users...</p>
              )}
              {!isLoading && filteredUsers.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  {memberSearch ? 'No matching users' : 'No users available'}
                </p>
              )}
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedUsers.includes(user.id) ? 'bg-[#246BFD]/5' : ''
                  }`}
                  onClick={() => toggleUser(user.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#246BFD] text-white text-sm">
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{user.phoneNumber}</p>
                    </div>
                  </div>
                  <Checkbox checked={selectedUsers.includes(user.id)} />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('info')}>
                Back
              </Button>
              <Button
                className="flex-1 bg-[#246BFD] hover:bg-[#1A56DB]"
                onClick={handleCreateGroup}
                disabled={isCreating || selectedUsers.length === 0}
              >
                {isCreating ? (
                  'Creating...'
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-1" />
                    Create {groupType === 'group' ? 'Group' : groupType === 'channel' ? 'Channel' : 'Community'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
