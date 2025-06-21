
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfilePictureProps {
  userEmail?: string;
  avatarUrl?: string;
  onAvatarUpdate: (newAvatarUrl: string | null) => void;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  userEmail,
  avatarUrl,
  onAvatarUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload a profile picture');
        return;
      }

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete existing avatar if it exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload image');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          avatar_url: publicUrl
        });

      if (updateError) {
        console.error('Profile update error:', updateError);
        toast.error('Failed to update profile');
        return;
      }

      onAvatarUpdate(publicUrl);
      toast.success('Profile picture updated successfully!');

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to remove your profile picture');
        return;
      }

      // Delete file from storage
      const fileName = avatarUrl.split('/').pop();
      if (fileName) {
        await supabase.storage.from('avatars').remove([`${user.id}/${fileName}`]);
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        toast.error('Failed to remove profile picture');
        return;
      }

      onAvatarUpdate(null);
      toast.success('Profile picture removed successfully!');

    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    if (!userEmail) return 'U';
    const name = userEmail.split('@')[0];
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-20 w-20 border-4 border-gray-200 dark:border-gray-700">
          <AvatarImage src={avatarUrl || undefined} alt="Profile picture" />
          <AvatarFallback className="text-xl font-medium bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
            {avatarUrl ? null : getInitials()}
          </AvatarFallback>
        </Avatar>
        <Button
          onClick={handleFileSelect}
          disabled={isUploading}
          size="sm"
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-blue-600 hover:bg-blue-700"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex space-x-2">
        <Button
          onClick={handleFileSelect}
          disabled={isUploading}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
        </Button>

        {avatarUrl && (
          <Button
            onClick={handleRemoveAvatar}
            disabled={isUploading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            <span>Remove</span>
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default ProfilePicture;
