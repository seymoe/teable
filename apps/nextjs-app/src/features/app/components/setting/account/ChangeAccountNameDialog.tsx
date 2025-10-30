import { useMutation } from '@tanstack/react-query';
import type { HttpError } from '@teable/core';
import { HttpErrorCode } from '@teable/core';
import { changeAccountName } from '@teable/openapi';
import { useSession } from '@teable/sdk/hooks';
import { Spin } from '@teable/ui-lib/base';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  useToast,
} from '@teable/ui-lib/shadcn';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';

interface IChangeAccountNameDialogProps {
  children?: React.ReactNode;
}

export const ChangeAccountNameDialog = (props: IChangeAccountNameDialogProps) => {
  const { children } = props;
  const { t } = useTranslation('common');
  const { user, refresh } = useSession();
  const { toast } = useToast();
  const [newAccountName, setNewAccountName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const {
    mutate: changeAccountNameMutate,
    isLoading,
    isSuccess,
  } = useMutation(changeAccountName, {
    onSuccess: () => {
      toast({
        title: t('settings.account.changeAccountName.success.title'),
        description: t('settings.account.changeAccountName.success.desc'),
      });
      setOpen(false);
      refresh?.();
    },
    meta: {
      preventGlobalError: true,
    },
    onError: (err: HttpError) => {
      if (err.code === HttpErrorCode.INVALID_CREDENTIALS) {
        setError(t('settings.account.changeAccountName.error.invalidPassword'));
      } else if (err.code === HttpErrorCode.VALIDATION_ERROR) {
        setError(t('settings.account.changeAccountName.error.invalidAccountName'));
      } else if (err.code === HttpErrorCode.CONFLICT) {
        setError(t('settings.account.changeAccountName.error.conflict'));
      } else {
        setError(err.message);
      }
    },
  });

  const reset = () => {
    setNewAccountName('');
    setCurrentPassword('');
    setError('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
    }
  };

  const disableSubmitBtn =
    !currentPassword || !newAccountName || newAccountName === user.accountName;

  const handleSubmit = async () => {
    if (newAccountName.length < 3 || newAccountName.length > 50) {
      setError(t('settings.account.changeAccountName.error.invalidLength'));
      return;
    }
    changeAccountNameMutate({ accountName: newAccountName, password: currentPassword });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="md:w-80">
        <DialogHeader>
          <DialogTitle className="text-center text-sm">
            {t('settings.account.changeAccountName.title')}
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            {t('settings.account.changeAccountName.desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground" htmlFor="currentAccountName">
              {t('settings.account.changeAccountName.current')}
            </Label>
            <Input
              className="h-7"
              id="currentAccountName"
              type="text"
              value={user.accountName}
              disabled
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground" htmlFor="newAccountName">
              {t('settings.account.changeAccountName.new')}
            </Label>
            <Input
              className="h-7"
              id="newAccountName"
              type="text"
              value={newAccountName}
              onChange={(e) => {
                setNewAccountName(e.target.value);
                setError('');
              }}
              placeholder={t('settings.account.changeAccountName.placeholder')}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground" htmlFor="currentPassword">
              {t('settings.account.changeAccountName.password')}
            </Label>
            <Input
              className="h-7"
              id="currentPassword"
              autoComplete="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError('');
              }}
              aria-autocomplete="inline"
            />
          </div>
          {error && <div className="text-center text-xs text-red-500">{error}</div>}
        </div>
        <DialogFooter className="flex-col space-y-2 sm:flex-col sm:space-x-0">
          <Button
            size={'sm'}
            className="w-full"
            type="submit"
            disabled={disableSubmitBtn || isSuccess || isLoading}
            onClick={handleSubmit}
          >
            {isLoading && <Spin className="mr-1 size-4" />}
            {t('actions.confirm')}
          </Button>
          <DialogClose asChild>
            <Button size={'sm'} className="w-full" variant={'ghost'}>
              {t('actions.cancel')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
