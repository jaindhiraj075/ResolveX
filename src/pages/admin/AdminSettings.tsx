import React from 'react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const AdminSettings: React.FC = () => {
  const { showToast } = useToast();

  const handleSave = () => {
    showToast('System SLA and threshold settings saved successfully.', 'success');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="System Settings"
        description="Global system parameters, SLA targets, and AI confidence thresholds"
      />

      <Card title="SLA & Escalation Thresholds" hoverElevation>
        <div className="space-y-4">
          <Input
            label="High Priority SLA Max Hours"
            defaultValue="24"
            type="number"
          />
          <Input
            label="Medium Priority SLA Max Hours"
            defaultValue="48"
            type="number"
          />
          <Input
            label="AI Auto-Routing Minimum Confidence (%)"
            defaultValue="80"
            type="number"
          />
          <div className="pt-2 flex justify-end">
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminSettings;
