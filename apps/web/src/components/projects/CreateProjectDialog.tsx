/**
 * Create Project Dialog
 *
 * Modal dialog for creating a new project with name and defaultCwd fields.
 */

'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useProjectStore } from '@/stores/project-store';

interface CreateProjectDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
}

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const router = useRouter();
  const { createProject, isLoading } = useProjectStore();

  const [name, setName] = useState('');
  const [defaultCwd, setDefaultCwd] = useState('~');
  const [errors, setErrors] = useState<{ name?: string; defaultCwd?: string }>({});

  const validate = useCallback(() => {
    const newErrors: { name?: string; defaultCwd?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Project name must be less than 100 characters';
    }

    if (!defaultCwd.trim()) {
      newErrors.defaultCwd = 'Working directory is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, defaultCwd]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      const project = await createProject({
        name: name.trim(),
        defaultCwd: defaultCwd.trim(),
      });

      if (project) {
        setName('');
        setDefaultCwd('~');
        setErrors({});
        onClose();
        router.push(`/projects/${project.id}`);
      }
    },
    [name, defaultCwd, validate, createProject, onClose, router]
  );

  const handleClose = useCallback(() => {
    setName('');
    setDefaultCwd('~');
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Create New Project"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-project-form"
            loading={isLoading}
            disabled={isLoading}
          >
            Create Project
          </Button>
        </>
      }
    >
      <form id="create-project-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Project Name"
          name="name"
          placeholder="My Project"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
          required
        />

        <Input
          label="Default Working Directory"
          name="defaultCwd"
          placeholder="~/projects/my-project"
          value={defaultCwd}
          onChange={(e) => setDefaultCwd(e.target.value)}
          error={errors.defaultCwd}
          helperText="New terminals will start in this directory"
          leftElement={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          }
          required
        />
      </form>
    </Dialog>
  );
}
