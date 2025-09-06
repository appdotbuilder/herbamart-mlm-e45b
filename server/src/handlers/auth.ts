import { type LoginInput, type User } from '../schema';

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is authenticating user login credentials and returning user data with JWT token.
    // Should verify username/password against database and generate secure JWT token.
    return Promise.resolve({
        user: {
            id: 1,
            username: input.username,
            password: '', // Never return actual password
            role: 'AGEN',
            created_at: new Date()
        },
        token: 'mock_jwt_token_' + Date.now()
    });
}

export async function getCurrentUser(token: string): Promise<User | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is verifying JWT token and returning current user data.
    // Should decode JWT token and fetch user from database.
    return Promise.resolve({
        id: 1,
        username: 'herbamart',
        password: '',
        role: 'AGEN',
        created_at: new Date()
    });
}

export async function resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is sending password reset email to user.
    // Should generate reset token, save to database, and send email via notification service.
    return Promise.resolve({
        success: true,
        message: 'Email reset password telah dikirim'
    });
}