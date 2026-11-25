import React, { useState } from 'react';
import { View, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ScreenWrapper } from '@/components/ui/layouts/ScreenWrapper';
import { AppHeader } from '@/components/ui/shared/AppHeader';
import { AppButton } from '@/components/ui/shared/AppButton';
import { InputField } from '@/components/ui/inputs/InputField';
import { useAppSelector } from '@/store/hooks';
import { changePassword } from '@/utils/backendApi';

type Field = 'oldPassword' | 'newPassword' | 'confirmNewPassword';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [values, setValues] = useState<Record<Field, string>>({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  const update = (field: Field) => (text: string) =>
    setValues((current) => ({ ...current, [field]: text }));

  const handleSave = async () => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace({ pathname: '/login', params: { redirect: '/change-password' } });
      return;
    }

    const nextErrors: Partial<Record<Field, string>> = {};
    if (!values.oldPassword) nextErrors.oldPassword = 'Enter your current password.';
    if (values.newPassword.length < 6) nextErrors.newPassword = 'Password must be at least 6 characters.';
    else if (values.newPassword === values.oldPassword)
      nextErrors.newPassword = 'Choose a password different from your current one.';
    if (values.confirmNewPassword !== values.newPassword)
      nextErrors.confirmNewPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    Keyboard.dismiss();
    setIsLoading(true);
    try {
      await changePassword(values.oldPassword, values.newPassword, values.confirmNewPassword);
      Toast.show({
        type: 'success',
        text1: 'Password Changed',
        text2: 'Use your new password the next time you sign in.',
      });
      router.back();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could Not Change Password',
        text2: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper
      header={<AppHeader title="Change Password" />}
      footer={
        <AppButton onPress={() => void handleSave()} loading={isLoading} disabled={isLoading}>
          Save new password
        </AppButton>
      }>
      <View className="gap-4">
        <InputField
          label="Current password"
          value={values.oldPassword}
          onChangeText={update('oldPassword')}
          error={errors.oldPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />
        <InputField
          label="New password"
          value={values.newPassword}
          onChangeText={update('newPassword')}
          error={errors.newPassword}
          helperText="At least 6 characters."
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <InputField
          label="Confirm new password"
          value={values.confirmNewPassword}
          onChangeText={update('confirmNewPassword')}
          error={errors.confirmNewPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={() => void handleSave()}
        />
      </View>
    </ScreenWrapper>
  );
}
