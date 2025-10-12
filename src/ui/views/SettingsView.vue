<template>
  <div class="settings-view">
    <!-- Header -->
    <div class="settings-header">
      <h1 class="settings-title">设置</h1>
      <p class="settings-subtitle">管理您的个人资料和偏好设置</p>
    </div>

    <!-- Settings Content -->
    <div class="settings-content">
      <!-- Profile Section -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">个人资料</h2>
          <p class="section-description">更新您的头像和个人信息</p>
        </div>

        <div class="section-body">
          <!-- Avatar Upload -->
          <div class="form-group avatar-group">
            <label class="form-label">头像</label>
            <div class="avatar-upload">
              <div class="avatar-preview">
                <img 
                  v-if="currentAvatar" 
                  :src="currentAvatar" 
                  alt="Avatar" 
                  class="avatar-image"
                />
                <div v-else class="avatar-placeholder">
                  <i class="icon">👤</i>
                </div>
              </div>
              <div class="avatar-actions">
                <button 
                  class="btn btn-secondary"
                  @click="triggerFileInput"
                >
                  选择图片
                </button>
                <button 
                  v-if="currentAvatar"
                  class="btn btn-text"
                  @click="removeAvatar"
                >
                  移除
                </button>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="handleFileSelect"
                />
              </div>
            </div>
          </div>

          <!-- Display Name -->
          <div class="form-group">
            <label class="form-label">显示名称</label>
            <input
              v-model="profileForm.displayName"
              type="text"
              class="form-input"
              placeholder="输入您的显示名称"
            />
          </div>

          <!-- Bio -->
          <div class="form-group">
            <label class="form-label">个人简介</label>
            <textarea
              v-model="profileForm.bio"
              class="form-input form-textarea"
              placeholder="介绍一下您自己..."
              rows="4"
            ></textarea>
          </div>

          <!-- Email -->
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input
              v-model="profileForm.email"
              type="email"
              class="form-input"
              placeholder="your.email@example.com"
            />
          </div>

          <!-- Save Button -->
          <div class="form-actions">
            <button 
              class="btn btn-primary"
              :disabled="isSavingProfile"
              @click="saveProfile"
            >
              {{ isSavingProfile ? '保存中...' : '保存更改' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Security Section -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">安全</h2>
          <p class="section-description">更改您的密码</p>
        </div>

        <div class="section-body">
          <!-- Current Password -->
          <div class="form-group">
            <label class="form-label">当前密码</label>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              class="form-input"
              placeholder="输入当前密码"
            />
          </div>

          <!-- New Password -->
          <div class="form-group">
            <label class="form-label">新密码</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              class="form-input"
              placeholder="输入新密码(至少6个字符)"
            />
          </div>

          <!-- Confirm New Password -->
          <div class="form-group">
            <label class="form-label">确认新密码</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="form-input"
              placeholder="再次输入新密码"
            />
          </div>

          <!-- Change Password Button -->
          <div class="form-actions">
            <button 
              class="btn btn-primary"
              :disabled="isChangingPassword"
              @click="changePassword"
            >
              {{ isChangingPassword ? '更改中...' : '更改密码' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Preferences Section -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">偏好设置</h2>
          <p class="section-description">自定义您的应用体验</p>
        </div>

        <div class="section-body">
          <!-- Theme -->
          <div class="form-group preference-item">
            <div class="preference-info">
              <label class="form-label">主题</label>
              <p class="preference-description">选择应用的外观主题</p>
            </div>
            <select v-model="preferencesForm.theme" class="form-select">
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="auto">自动</option>
            </select>
          </div>

          <!-- Auto Save -->
          <div class="form-group preference-item">
            <div class="preference-info">
              <label class="form-label">自动保存</label>
              <p class="preference-description">在您编辑时自动保存内容</p>
            </div>
            <label class="toggle-switch">
              <input 
                v-model="preferencesForm.autoSave" 
                type="checkbox"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Save Preferences Button -->
          <div class="form-actions">
            <button 
              class="btn btn-primary"
              :disabled="isSavingPreferences"
              @click="savePreferences"
            >
              {{ isSavingPreferences ? '保存中...' : '保存偏好' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useAppStore } from '../stores/app';

const userStore = useUserStore();
const appStore = useAppStore();

// Avatar
const fileInput = ref<HTMLInputElement | null>(null);
const currentAvatar = ref<string>('');

// Profile Form
const profileForm = reactive({
  displayName: '',
  bio: '',
  email: '',
});

const isSavingProfile = ref(false);

// Password Form
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const isChangingPassword = ref(false);

// Preferences Form
const preferencesForm = reactive({
  theme: 'auto' as 'light' | 'dark' | 'auto',
  autoSave: true,
});

const isSavingPreferences = ref(false);

// Load user data on mount
onMounted(async () => {
  if (userStore.currentUser) {
    profileForm.displayName = userStore.currentUser.displayName || '';
    profileForm.bio = userStore.currentUser.bio || '';
    profileForm.email = userStore.currentUser.email || '';
    currentAvatar.value = userStore.currentUser.avatarUrl || '';
  }

  // Load preferences
  const theme = appStore.theme || 'auto';
  preferencesForm.theme = theme as 'light' | 'dark' | 'auto';
});

// Avatar functions
const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (!file) return;

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB');
    return;
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件');
    return;
  }

  // Read file as base64
  const reader = new FileReader();
  reader.onload = (e) => {
    currentAvatar.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const removeAvatar = () => {
  currentAvatar.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// Profile functions
const saveProfile = async () => {
  if (!userStore.currentUser) return;

  // Validate
  if (!profileForm.displayName.trim()) {
    alert('请输入显示名称');
    return;
  }

  if (profileForm.email && !isValidEmail(profileForm.email)) {
    alert('请输入有效的邮箱地址');
    return;
  }

  isSavingProfile.value = true;

  try {
    await userStore.updateProfile({
      displayName: profileForm.displayName,
      bio: profileForm.bio,
      email: profileForm.email,
      avatarUrl: currentAvatar.value,
    });

    alert('个人资料已更新');
  } catch (error) {
    console.error('Failed to update profile:', error);
    alert('更新失败,请重试');
  } finally {
    isSavingProfile.value = false;
  }
};

// Password functions
const changePassword = async () => {
  // Validate
  if (!passwordForm.currentPassword) {
    alert('请输入当前密码');
    return;
  }

  if (!passwordForm.newPassword) {
    alert('请输入新密码');
    return;
  }

  if (passwordForm.newPassword.length < 6) {
    alert('新密码至少需要6个字符');
    return;
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    alert('两次输入的新密码不一致');
    return;
  }

  isChangingPassword.value = true;

  try {
    await userStore.changePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    );

    alert('密码已更改');
    
    // Clear form
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (error: any) {
    console.error('Failed to change password:', error);
    alert(error.message || '更改密码失败,请重试');
  } finally {
    isChangingPassword.value = false;
  }
};

// Preferences functions
const savePreferences = async () => {
  isSavingPreferences.value = true;

  try {
    // Update theme
    appStore.setTheme(preferencesForm.theme);

    alert('偏好设置已保存');
  } catch (error) {
    console.error('Failed to save preferences:', error);
    alert('保存失败,请重试');
  } finally {
    isSavingPreferences.value = false;
  }
};

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
</script>

<style scoped>
.settings-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.settings-header {
  margin-bottom: 2rem;
  color: white;
}

.settings-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.settings-subtitle {
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
}

.settings-content {
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #1a202c;
}

.section-description {
  font-size: 0.875rem;
  color: #718096;
  margin: 0;
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Form Styles */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
}

.form-input {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  transition: all 0.3s;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-select {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
}

.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Avatar Styles */
.avatar-group {
  margin-bottom: 0.5rem;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: #f7fafc;
  border: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 3rem;
  color: #cbd5e0;
}

.avatar-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Preference Item */
.preference-item {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f7fafc;
  border-radius: 8px;
}

.preference-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.preference-description {
  font-size: 0.875rem;
  color: #718096;
  margin: 0;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #667eea;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

/* Buttons */
.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover:not(:disabled) {
  background: #f7fafc;
}

.btn-text {
  background: transparent;
  color: #e53e3e;
  padding: 0.5rem 1rem;
}

.btn-text:hover:not(:disabled) {
  background: #fff5f5;
}
</style>