<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_CITIZEN = 'citizen';

    public const ROLE_WORKER = 'worker';

    public const ROLE_ADMIN = 'admin';

    public const ROLES = [
        self::ROLE_CITIZEN,
        self::ROLE_WORKER,
        self::ROLE_ADMIN,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'father_name',
        'last_name',
        'email',
        'role',
        'phone',
        'country',
        'city',
        'area',
        'assigned_municipality',
        'street',
        'building',
        'is_verified',
        'profile_picture_url',
        'password',
    ];

    protected $appends = [
        'role_names',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_verified' => 'boolean',
        ];
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class)->withTimestamps();
    }

    public function scopeWithRole($query, string $role)
    {
        return $query->where(function ($query) use ($role) {
            $query
                ->where('role', $role)
                ->orWhereHas('roles', fn ($roles) => $roles->where('name', $role));
        });
    }

    public function getRoleNamesAttribute(): array
    {
        if ($this->relationLoaded('roles')) {
            return $this->roles->pluck('name')->values()->all();
        }

        return array_values(array_filter([$this->role]));
    }

    public function issues()
    {
        return $this->hasMany(Issue::class);
    }

    public function commuTechNotifications()
    {
        return $this->hasMany(CommuTechNotification::class);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(self::ROLE_ADMIN);
    }

    public function isWorker(): bool
    {
        return $this->hasRole(self::ROLE_WORKER);
    }

    public function isCitizen(): bool
    {
        return $this->hasRole(self::ROLE_CITIZEN);
    }

    public function hasRole(string $role): bool
    {
        if ($this->role === $role) {
            return true;
        }

        if ($this->relationLoaded('roles')) {
            return $this->roles->contains('name', $role);
        }

        return $this->roles()->where('name', $role)->exists();
    }

    public function hasAnyRole(array $roles): bool
    {
        return collect($roles)->contains(fn (string $role) => $this->hasRole($role));
    }

    public function syncRolesByName(array $roles): void
    {
        $roles = collect($roles)
            ->filter(fn ($role) => in_array($role, self::ROLES, true))
            ->unique()
            ->values();

        if ($roles->isEmpty()) {
            $roles = collect([self::ROLE_CITIZEN]);
        }

        $roleIds = Role::query()
            ->whereIn('name', $roles)
            ->pluck('id')
            ->all();

        $this->roles()->sync($roleIds);
    }
}
