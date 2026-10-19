import React, { useState } from 'react';
import { User as UserIcon, Mail, Building2, Phone, Hash, ShieldCheck, Edit3, Save, X } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const ProfilePage: React.FC = () => {
  const { user, role, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const roleBadgeVariant =
    role === 'ADMIN' ? 'purple' : role === 'STAFF' ? 'indigo' : 'green';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Full name cannot be empty', 'warning');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      showToast('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="User Profile"
        description="Manage your personal details and authenticated college credentials"
        badge={
          <Badge variant={roleBadgeVariant} size="sm">
            {role} Account
          </Badge>
        }
        actions={
          !isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              icon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Edit Profile
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              icon={<X className="w-3.5 h-3.5" />}
            >
              Cancel
            </Button>
          )
        }
      />

      <Card title="Account Information" hoverElevation>
        {!isEditing ? (
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={user?.full_name || ''}
              readOnly
              icon={<UserIcon className="w-4 h-4" />}
            />

            <Input
              label="College Email Address"
              value={user?.email || ''}
              readOnly
              icon={<Mail className="w-4 h-4" />}
              helperText="Email address is tied to your institutional authentication credentials and cannot be edited directly."
            />

            {role === 'STUDENT' && (
              <Input
                label="Student ID / Roll Number"
                value={user?.student_id_number || 'STU-2024-8891'}
                readOnly
                icon={<Hash className="w-4 h-4" />}
              />
            )}

            {(role === 'STAFF' || user?.department_name) && (
              <Input
                label="Assigned Department"
                value={user?.department_name || 'IT / Network Department'}
                readOnly
                icon={<Building2 className="w-4 h-4" />}
              />
            )}

            <Input
              label="Contact Phone"
              value={user?.phone || 'Not provided'}
              readOnly
              icon={<Phone className="w-4 h-4" />}
            />

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Verified {role} record in College Directory</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                icon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Edit Details
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Full Name *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dhiraj Jain"
              icon={<UserIcon className="w-4 h-4" />}
              required
            />

            <Input
              label="College Email (Read Only)"
              value={user?.email || ''}
              readOnly
              icon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              icon={<Phone className="w-4 h-4" />}
            />

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;
