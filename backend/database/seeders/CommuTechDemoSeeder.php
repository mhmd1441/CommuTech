<?php

namespace Database\Seeders;

use App\Models\CommuTechNotification;
use App\Models\Issue;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class CommuTechDemoSeeder extends Seeder
{
    public function run(): void
    {
        foreach (User::ROLES as $role) {
            Role::firstOrCreate(['name' => $role]);
        }

        CommuTechNotification::query()->whereNotNull('issue_id')->delete();
        Issue::query()->delete();

        $this->seedUser([
            'first_name' => 'Maya',
            'father_name' => 'Nabil',
            'last_name' => 'Khoury',
            'email' => 'mayakhoury@gmail.com',
            'phone' => '+961 70910001',
            'city' => 'Beirut',
            'area' => 'Hamra',
            'street' => 'Bliss Street',
            'building' => 'A12',
            'profile_picture_url' => 'https://i.pravatar.cc/300?img=47',
        ], [User::ROLE_CITIZEN]);

        $this->seedUser([
            'first_name' => 'Omar',
            'father_name' => 'Samir',
            'last_name' => 'Haddad',
            'email' => 'omarhaddad@gmail.com',
            'phone' => '+961 70910002',
            'city' => 'Tripoli',
            'area' => 'Mina',
            'street' => 'Port Road',
            'building' => 'B7',
            'profile_picture_url' => 'https://i.pravatar.cc/300?img=12',
        ], [User::ROLE_CITIZEN]);

        $this->seedUser([
            'first_name' => 'Lea',
            'father_name' => 'George',
            'last_name' => 'Saliba',
            'email' => 'leasaliba@gmail.com',
            'phone' => '+961 70910003',
            'city' => 'Zahle',
            'area' => 'Haouch El Omara',
            'street' => 'Main Road',
            'building' => 'C4',
            'profile_picture_url' => 'https://i.pravatar.cc/300?img=32',
        ], [User::ROLE_CITIZEN, User::ROLE_WORKER]);

        $this->seedUser([
            'first_name' => 'Rami',
            'father_name' => 'Fadi',
            'last_name' => 'Saade',
            'email' => 'ramisaade@gmail.com',
            'phone' => '+961 70910004',
            'city' => 'Saida',
            'area' => 'Old Souk',
            'street' => 'Sea Road',
            'building' => 'D9',
            'profile_picture_url' => 'https://i.pravatar.cc/300?img=15',
        ], [User::ROLE_CITIZEN]);

        $this->seedUser([
            'first_name' => 'Nour',
            'father_name' => 'Walid',
            'last_name' => 'Aoun',
            'email' => 'nouraoun@gmail.com',
            'phone' => '+961 70910005',
            'city' => 'Byblos',
            'area' => 'Jbeil Center',
            'street' => 'Roman Road',
            'building' => 'E3',
            'profile_picture_url' => 'https://i.pravatar.cc/300?img=26',
        ], [User::ROLE_CITIZEN]);

        $this->seedUser([
            'first_name' => 'Admin',
            'father_name' => 'CommuTech',
            'last_name' => 'Control',
            'email' => 'admin@gmail.com',
            'phone' => '+961 70919999',
            'city' => 'Beirut',
            'area' => 'Downtown',
            'street' => 'Municipality Street',
            'building' => 'HQ1',
            'profile_picture_url' => 'https://i.pravatar.cc/300?img=68',
            'password' => 'admin123',
        ], [User::ROLE_ADMIN]);
    }

    private function seedUser(array $data, array $roles): User
    {
        $password = $data['password'] ?? 'password123';
        unset($data['password']);

        $name = trim(collect([
            $data['first_name'] ?? null,
            $data['father_name'] ?? null,
            $data['last_name'] ?? null,
        ])->filter()->implode(' '));

        $user = User::updateOrCreate(
            ['email' => $data['email']],
            [
                ...$data,
                'name' => $name,
                'role' => $this->primaryRole($roles),
                'country' => 'Lebanon',
                'is_verified' => true,
                'password' => $password,
            ]
        );

        $user->syncRolesByName($roles);

        return $user;
    }

    private function primaryRole(array $roles): string
    {
        if (in_array(User::ROLE_ADMIN, $roles, true)) {
            return User::ROLE_ADMIN;
        }

        if (in_array(User::ROLE_CITIZEN, $roles, true)) {
            return User::ROLE_CITIZEN;
        }

        return $roles[0] ?? User::ROLE_CITIZEN;
    }
}
